import { FunctionComponent, useEffect, useMemo, useReducer } from "react";
import "@css/NwbHierarchyView.css";
import { formatBytes } from "@shared/util/formatBytes";
import { DatasetFile } from "./plugins/pluginInterface";

type Props = {
  topLevelFiles: DatasetFile[];
  onOpenFile: (file: DatasetFile) => void;
  fetchDirectory: (file: DatasetFile) => Promise<DatasetFile[]>; // fetches the files in a directory
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

type LoadedFiles = DatasetFile[];

type LoadedFilesAction = {
  type: "add";
  file: DatasetFile;
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

const DatasetMainTab: FunctionComponent<Props> = ({
  topLevelFiles,
  onOpenFile,
  fetchDirectory,
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
    const ret: DatasetFile[] = [];
    const alphabeticallySorted = loadedFiles.sort((a, b) =>
      a.filepath.localeCompare(b.filepath),
    );
    const handle = (prefix: string) => {
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

  const handleExpandDirectory = async (file: DatasetFile) => {
    if (expandedDirectories[file.id]) {
      expandedDirectoriesDispatch({
        type: "toggle",
        directoryId: file.id,
      });
      return;
    }
    const newFiles = await fetchDirectory(file);
    for (const f of newFiles) {
      loadedFilesDispatch({ type: "add", file: f });
    }
    expandedDirectoriesDispatch({
      type: "toggle",
      directoryId: file.id,
    });
  };

  return (
    <div style={{ margin: "10px", maxWidth: 750 }}>
      <table className="nwb-hierarchy-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
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
                <td></td>
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
                      title="View in new tab"
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
                    {file.urls.length > 0 && (
                      // Download
                      <span
                        title="Download"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(file.urls[0]);
                        }}
                        style={{
                          cursor: "pointer",
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
                        ⬇
                      </span>
                    )}
                  </div>
                </td>
                <td>{formatBytes(file.size)}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DatasetMainTab;
