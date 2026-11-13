import {
  Breadcrumbs,
  Button,
  IconButton,
  InlineMessage,
  LoadingState,
  Tree,
  useLoadingPhase,
  type TreeNode,
} from "@ui";
import { formatBytes } from "@shared/util/formatBytes";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { DatasetFile } from "./plugins/pluginInterface";
import { folderCrumbs, joinLocation, parseLocation } from "./folderLocation";
import "./DatasetMainTab.css";

type Props = {
  topLevelFiles: DatasetFile[];
  onOpenFile: (file: DatasetFile) => void;
  /** The location parameter as it is in the URL, null when there is none. */
  location: string | null;
  /** One folder's contents by path; null when there is no such folder. */
  loadFolder: (path: string) => Promise<DatasetFile[] | null>;
  /** The link to a folder, "" for All files. */
  hrefFor: (path: string) => string;
  /** Follows a link from hrefFor in the app, adding a history entry. */
  onNavigate: (href: string) => void;
  onCopyLink: (path: string) => void;
  additionalControls?: JSX.Element;
};

type Listing = { path: string; files: DatasetFile[] | null; failed?: boolean };

const byPath = (a: DatasetFile, b: DatasetFile) =>
  a.filepath.localeCompare(b.filepath);

const kindOf = (file: DatasetFile): TreeNode["kind"] =>
  file.directory ? "folder" : file.filename.endsWith(".nwb") ? "nwb" : "file";

/** One folder of a dataset at a time, under a breadcrumb from All files; opening a folder moves into it. */
const DatasetMainTab: FunctionComponent<Props> = ({
  topLevelFiles,
  onOpenFile,
  location,
  loadFolder,
  hrefFor,
  onNavigate,
  onCopyLink,
  additionalControls,
}) => {
  const requested = parseLocation(location);
  const [listing, setListing] = useState<Listing>();
  const [selected, setSelected] = useState<string>();
  const container = useRef<HTMLDivElement>(null);
  const focusList = useRef(false);

  useEffect(() => {
    setSelected(undefined);
    if (!requested) return;
    let canceled = false;
    loadFolder(requested).then(
      (files) => !canceled && setListing({ path: requested, files }),
      () =>
        !canceled && setListing({ path: requested, files: null, failed: true }),
    );
    return () => {
      canceled = true;
    };
  }, [requested, loadFolder]);

  const loaded = listing?.path === requested;
  const missing = requested === null || (loaded && listing.files === null);
  const loadingFolder = Boolean(requested) && !loaded;
  const phase = useLoadingPhase(loadingFolder);
  const path = missing ? "" : (requested ?? "");
  const files = useMemo(
    () => (!path ? topLevelFiles : loaded ? (listing?.files ?? []) : undefined),
    [path, topLevelFiles, loaded, listing],
  );

  // After moving with a click or a key, focus stays in the list.
  useEffect(() => {
    if (!files || !focusList.current) return;
    focusList.current = false;
    container.current
      ?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]')
      ?.focus();
  }, [files]);

  const filesById = useMemo(
    () => new Map((files ?? []).map((file) => [file.id, file])),
    [files],
  );
  const nodes: TreeNode[] = [...(files ?? [])].sort(byPath).map((file) => ({
    id: file.id,
    name: file.filename,
    kind: kindOf(file),
    size: file.directory ? undefined : formatBytes(file.size),
  }));

  const move = (href: string) => {
    focusList.current = true;
    onNavigate(href);
  };

  const selectedFile = selected ? filesById.get(selected) : undefined;
  const download =
    selectedFile && !selectedFile.directory ? selectedFile.urls[0] : undefined;

  return (
    <div className="dataset-files" ref={container}>
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
      {missing && location && (
        <InlineMessage status={listing?.failed ? "error" : "warning"}>
          {listing?.failed
            ? `Couldn’t open the folder ${location}, so here are all files.`
            : `There’s no folder ${location} in this dataset, so here are all files.`}
        </InlineMessage>
      )}
      <div className="dataset-files-folder">
        <div className="dataset-files-location">
          <Breadcrumbs
            label="Folder"
            items={folderCrumbs(path, hrefFor)}
            onNavigate={move}
          />
          <IconButton
            icon="link"
            label="Copy link to this folder"
            variant="ghost"
            size="sm"
            tooltipPlacement="left"
            onClick={() => onCopyLink(path)}
          />
        </div>
        {files ? (
          nodes.length > 0 ? (
            <Tree
              label={path ? `Files in ${path}` : "Files in this dataset"}
              nodes={nodes}
              expanded={[]}
              onExpandedChange={() => {}}
              selected={selected}
              onSelect={setSelected}
              onOpenFolder={(node) =>
                move(hrefFor(joinLocation(path, node.name)))
              }
              onOpen={(node) => {
                const file = filesById.get(node.id);
                if (file) onOpenFile(file);
              }}
            />
          ) : (
            <p className="dataset-files-hint">No files in this folder.</p>
          )
        ) : (
          <LoadingState label="Loading the folder" phase={phase} />
        )}
      </div>
    </div>
  );
};

export default DatasetMainTab;
