/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useReducer } from "react";
import "../../../css/NwbHierarchyView.css";
import { OpenNeuroFile } from "../plugins/pluginInterface";

type Props = {
  datasetId: string;
  snapshotTag: string;
  topLevelFiles: OpenNeuroFile[];
  onOpenFile: (file: OpenNeuroFile) => void;
};

type ExpandedDirectoriesState = {
  [id: string]: boolean;
};

type ExpandedDirectoriesAction = {
  type: "toggle";
  directoryId: string;
};

const expandedDirectoriesReducer = (
  state: ExpandedDirectoriesState,
  action: ExpandedDirectoriesAction,
): ExpandedDirectoriesState => {
  switch (action.type) {
    case "toggle": {
      const directoryId = action.directoryId;
      return { ...state, [directoryId]: !state[directoryId] };
    }
    default: {
      throw Error("Unexpected action type");
    }
  }
};

const fetchDirectory = async (
  datasetId: string,
  snapshotTag: string,
  parent: OpenNeuroFile,
): Promise<OpenNeuroFile[]> => {
  const query =
    `query snapshot($datasetId: ID!, $tag: String!, $tree: String!) {
    snapshot(datasetId: $datasetId, tag: $tag) {
      files(tree: $tree) {
        id
        key
        filename
        directory
        size
        urls
      }
    }
  }`
      .split("\n")
      .join("\\n");

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: { "content-type": "application/json" },
    body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}","tree":"${parent.id}"},"query":"${query}"}`,
    method: "POST",
  });

  if (!resp.ok) throw new Error("Failed to fetch OpenNeuro directory");
  const data = await resp.json();
  return data.data.snapshot.files.map((a: any) => ({
    id: a.id,
    key: a.key,
    filepath: parent.filepath + "/" + a.filename,
    filename: a.filename,
    directory: a.directory,
    size: a.size,
    urls: a.urls,
  }));
};

type LoadedFiles = OpenNeuroFile[];

type LoadedFilesAction = {
  type: "add";
  file: OpenNeuroFile;
};

const loadedFilesReducer = (
  state: LoadedFiles,
  action: LoadedFilesAction,
): LoadedFiles => {
  switch (action.type) {
    case "add": {
      if (state.find((a) => a.id === action.file.id)) return state;
      return [...state, action.file];
    }
    default: {
      throw Error("Unexpected action type");
    }
  }
};

const getIndent = (filepath: string, isFile: boolean) => {
  let x = (filepath.split("/").length - 1) * 10;
  if (isFile && filepath.includes("/")) {
    x += 15;
  }
  if (isFile && !filepath.includes("/")) {
    x += 5;
  }
  return x;
};

const OpenNeuroMainTab: FunctionComponent<Props> = ({
  datasetId,
  snapshotTag,
  topLevelFiles,
  onOpenFile,
}) => {
  const [expandedDirectories, expandedDirectoriesDispatch] = useReducer(
    expandedDirectoriesReducer,
    {},
  );

  const [loadedFiles, loadedFilesDispatch] = useReducer(loadedFilesReducer, []);
  useEffect(() => {
    for (const f of topLevelFiles) {
      loadedFilesDispatch({ type: "add", file: f });
    }
  }, [topLevelFiles]);

  const filesToDisplay = useMemo(() => {
    // we need to sort the files so they appear in the nested order that they would appear in the file tree
    // and we want to exclude things if any ancestor is not expanded
    const ret: OpenNeuroFile[] = [];
    const alphabeticallySorted = loadedFiles.sort((a, b) =>
      a.filepath.localeCompare(b.filepath),
    );
    const handle = (prefix: string) => {
      console.log("--- handle", prefix);
      for (const file of alphabeticallySorted) {
        const parts = file.filepath.split("/");
        let ok = false;
        if (prefix === "") {
          ok = parts.length === 1;
        } else {
          ok =
            file.filepath.startsWith(prefix + "/") &&
            parts.length === prefix.split("/").length + 1;
        }
        if (ok) {
          ret.push(file);
          if (file.directory && expandedDirectories[file.id]) {
            handle(file.filepath);
          }
        }
      }
    };
    handle("");
    return ret;
  }, [loadedFiles, expandedDirectories]);

  const handleExpandDirectory = async (file: OpenNeuroFile) => {
    console.log("--- handleExpandDirectory", file);
    if (expandedDirectories[file.id]) {
      expandedDirectoriesDispatch({
        type: "toggle",
        directoryId: file.id,
      });
      return;
    }
    const newFiles = await fetchDirectory(datasetId, snapshotTag, file);
    console.log("--- newFiles", newFiles);
    for (const f of newFiles) {
      loadedFilesDispatch({ type: "add", file: f });
    }
    expandedDirectoriesDispatch({
      type: "toggle",
      directoryId: file.id,
    });
  };

  return (
    <div style={{ margin: "10px" }}>
      <table className="nwb-hierarchy-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {filesToDisplay.map((file) =>
            file.directory ? (
              <tr key={file.id}>
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{ marginRight: getIndent(file.filepath, false) }}
                    ></span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpandDirectory(file);
                      }}
                      style={{
                        cursor: "pointer",
                        width: "20px",
                        userSelect: "none",
                      }}
                    >
                      {expandedDirectories[file.id] ? "▼" : "►"}
                    </span>
                    <span>{file.filename}</span>
                  </div>
                </td>
                <td>directory</td>
              </tr>
            ) : (
              // file
              <tr
                key={file.id}
                onClick={() => onOpenFile(file)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{ marginRight: getIndent(file.filepath, true) }}
                    ></span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#666",
                          fontFamily: "monospace",
                          position: "relative",
                          top: "-1px",
                        }}
                      >
                        ▪️
                      </span>
                      <span>{file.filename}</span>
                    </span>
                    <span
                      title="Open in new tab"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFile(file);
                      }}
                      style={{
                        cursor: "pointer",
                        opacity: 0.7,
                        fontSize: "16px",
                        marginLeft: "4px",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.backgroundColor =
                          "rgba(0,0,0,0.05)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = "0.7";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      ⧉
                    </span>
                  </div>
                </td>
                <td>file</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OpenNeuroMainTab;
