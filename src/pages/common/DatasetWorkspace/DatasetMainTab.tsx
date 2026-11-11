import { Button, Tree, type TreeNode } from "@ui";
import { formatBytes } from "@shared/util/formatBytes";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { DatasetFile } from "./plugins/pluginInterface";
import "./DatasetMainTab.css";

type Props = {
  topLevelFiles: DatasetFile[];
  onOpenFile: (file: DatasetFile) => void;
  /** Fetches the files in a directory. */
  fetchDirectory: (file: DatasetFile) => Promise<DatasetFile[]>;
  additionalControls?: JSX.Element;
};

const byPath = (a: DatasetFile, b: DatasetFile) =>
  a.filepath.localeCompare(b.filepath);

const kindOf = (file: DatasetFile): TreeNode["kind"] =>
  file.directory ? "folder" : file.filename.endsWith(".nwb") ? "nwb" : "file";

/** A dataset’s folders and files, loaded a folder at a time; the whole row opens a folder or a file. */
const DatasetMainTab: FunctionComponent<Props> = ({
  topLevelFiles,
  onOpenFile,
  fetchDirectory,
  additionalControls,
}) => {
  const [contents, setContents] = useState<Record<string, DatasetFile[]>>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();

  // New top-level files, such as a different version, start the tree afresh.
  useEffect(() => {
    setContents({});
    setExpanded([]);
    setSelected(undefined);
  }, [topLevelFiles]);

  const filesById = useMemo(() => {
    const map = new Map<string, DatasetFile>();
    for (const file of [...topLevelFiles, ...Object.values(contents).flat()])
      map.set(file.id, file);
    return map;
  }, [topLevelFiles, contents]);

  const toNode = (file: DatasetFile): TreeNode => ({
    id: file.id,
    name: file.filename,
    kind: kindOf(file),
    size: file.directory ? undefined : formatBytes(file.size),
    children:
      file.directory && contents[file.id]
        ? [...contents[file.id]].sort(byPath).map(toNode)
        : undefined,
  });

  const nodes = [...topLevelFiles].sort(byPath).map(toNode);

  const onExpandedChange = async (next: string[]) => {
    setExpanded(next);
    for (const id of next) {
      const folder = filesById.get(id);
      if (!folder || contents[id]) continue;
      try {
        const files = await fetchDirectory(folder);
        setContents((prev) => ({ ...prev, [id]: files }));
      } catch (error) {
        console.error("Error fetching directory contents:", error);
      }
    }
  };

  const selectedFile = selected ? filesById.get(selected) : undefined;
  const download =
    selectedFile && !selectedFile.directory ? selectedFile.urls[0] : undefined;

  return (
    <div className="dataset-files">
      <div className="dataset-files-toolbar">
        {additionalControls}
        {download ? (
          <Button
            size="sm"
            icon="download"
            href={download}
            target="_blank"
            rel="noopener noreferrer"
          >
            {`Download ${selectedFile?.filename}`}
          </Button>
        ) : (
          <p className="dataset-files-hint">
            Click a file to open it, then download it from here.
          </p>
        )}
      </div>
      <Tree
        label="Files in this dataset"
        nodes={nodes}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        selected={selected}
        onSelect={setSelected}
        onOpen={(node) => {
          const file = filesById.get(node.id);
          if (file) onOpenFile(file);
        }}
      />
    </div>
  );
};

export default DatasetMainTab;
