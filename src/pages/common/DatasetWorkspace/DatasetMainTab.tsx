import {
  Breadcrumbs,
  Button,
  IconButton,
  InlineMessage,
  Tree,
  type TreeNode,
} from "@ui";
import { formatBytes } from "@shared/util/formatBytes";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DatasetFile } from "./plugins/pluginInterface";
import { folderCrumbs, parseLocation } from "./folderLocation";
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
  /** Follows a link from hrefFor in the app; replace swaps the history entry instead of adding one. */
  onNavigate: (href: string, options?: { replace?: boolean }) => void;
  onCopyLink: (path: string) => void;
  additionalControls?: JSX.Element;
};

type Folder = { status: "loading" | "error" | "ready"; files?: DatasetFile[] };

/** Items listed per level before Show more. */
export const PAGE = 25;

const byName = (a: DatasetFile, b: DatasetFile) =>
  a.filename.localeCompare(b.filename, undefined, { numeric: true });

const kindOf = (file: DatasetFile): TreeNode["kind"] =>
  file.directory ? "folder" : file.filename.endsWith(".nwb") ? "nwb" : "file";

const count = (n: number) => `${n.toLocaleString()} file${n === 1 ? "" : "s"}`;

/** "2 files · 1.34 GB" for a folder, the size for a file. */
const summary = (file: DatasetFile) =>
  !file.directory
    ? formatBytes(file.size)
    : [
        file.fileCount !== undefined && count(file.fileCount),
        file.size > 0 && formatBytes(file.size),
      ]
        .filter(Boolean)
        .join(" · ") || undefined;

/** Each folder above path and path itself: "a", "a/b", "a/b/c". */
const pathTo = (path: string) =>
  path
    ? path.split("/").map((_, i, parts) => parts.slice(0, i + 1).join("/"))
    : [];

/** A dataset's files as a tree: folders open in place, and the last one opened is in the address. */
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
  const [folders, setFolders] = useState<Map<string, Folder>>(new Map());
  const [expanded, setExpanded] = useState<string[]>([]);
  const [shown, setShown] = useState<Map<string, number>>(new Map());
  const [missing, setMissing] = useState<{ path: string; failed: boolean }>();
  const [selectedFile, setSelectedFile] = useState<DatasetFile>();

  const setFolder = (path: string, folder: Folder) =>
    setFolders((all) => new Map(all).set(path, folder));

  // Resolves to the folder's files, or null when it isn't there; failures show in the tree.
  const load = useCallback(
    async (path: string): Promise<DatasetFile[] | null> => {
      setFolder(path, { status: "loading" });
      try {
        const files = await loadFolder(path);
        setFolder(path, { status: "ready", files: files ?? [] });
        return files;
      } catch {
        setFolder(path, { status: "error" });
        throw new Error(`Couldn’t load ${path}`);
      }
    },
    [loadFolder],
  );

  // A link opens every folder down to its location, then brings that folder into view.
  useEffect(() => {
    setMissing(undefined);
    if (requested === null) return;
    let canceled = false;
    (async () => {
      for (const path of pathTo(requested)) {
        // A folder already loading or loaded was opened from the tree, so it exists.
        if (!folders.has(path)) {
          let files: DatasetFile[] | null;
          try {
            files = await load(path);
          } catch {
            if (!canceled) setMissing({ path: requested, failed: true });
            return;
          }
          if (canceled) return;
          if (!files) return setMissing({ path: requested, failed: false });
        }
        setExpanded((open) => (open.includes(path) ? open : [...open, path]));
      }
      if (!canceled && requested)
        requestAnimationFrame(() =>
          document
            .getElementById(`tree-${requested}`)
            ?.scrollIntoView?.({ block: "nearest" }),
        );
    })();
    return () => {
      canceled = true;
    };
    // Only a new location opens folders; later loads don't re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, load]);

  // A path that climbs with . or .. is treated like a folder that isn't there.
  const fallback =
    missing ?? (requested === null ? { failed: false } : undefined);
  const current = fallback ? "" : (requested ?? "");
  const filesIn = (path: string) =>
    path ? folders.get(path)?.files : topLevelFiles;
  const byPath = useMemo(() => {
    const all = new Map<string, DatasetFile>();
    for (const file of topLevelFiles) all.set(file.filepath, file);
    for (const folder of folders.values())
      for (const file of folder.files ?? []) all.set(file.filepath, file);
    return all;
  }, [topLevelFiles, folders]);

  const nodesIn = (path: string): TreeNode[] => {
    const files = [...(filesIn(path) ?? [])].sort(byName);
    return files.slice(0, shown.get(path) ?? PAGE).map((file) => {
      const node: TreeNode = {
        id: file.filepath,
        name: file.filename,
        kind: kindOf(file),
        size: summary(file),
      };
      if (!file.directory) return node;
      const folder = folders.get(file.filepath);
      if (folder?.status === "loading" || folder?.status === "error")
        node.status = folder.status;
      if (folder?.files) {
        node.children = nodesIn(file.filepath);
        node.more = {
          shown: Math.min(
            shown.get(file.filepath) ?? PAGE,
            folder.files.length,
          ),
          total: folder.files.length,
        };
      }
      return node;
    });
  };
  const nodes = nodesIn("");

  const open = (path: string) => onNavigate(hrefFor(path), { replace: true });
  const onExpandedChange = (next: string[]) => {
    const opened = next.find((id) => !expanded.includes(id));
    setExpanded(next);
    if (opened === undefined) return;
    if (!folders.has(opened)) load(opened).catch(() => {});
    open(opened);
  };
  const collapseOthers = () => setExpanded(pathTo(current));
  const collapseAll = () => {
    setExpanded([]);
    if (current) open("");
  };

  const folder = current ? byPath.get(current) : undefined;
  const totals = folder
    ? `${folder.filename}: ${summary(folder) ?? ""}`
    : (() => {
        const folderCount = topLevelFiles.filter((f) => f.directory).length;
        return `${folderCount.toLocaleString()} folder${folderCount === 1 ? "" : "s"} · ${count(topLevelFiles.length - folderCount)}`;
      })();
  const download =
    selectedFile && !selectedFile.directory ? selectedFile.urls[0] : undefined;

  return (
    <div className="dataset-files">
      <div className="dataset-files-toolbar">
        {additionalControls}
        <span className="dataset-files-count">{totals}</span>
        <div className="dataset-files-actions">
          <Button
            size="sm"
            variant="ghost"
            disabled={expanded.length === 0}
            onClick={collapseOthers}
          >
            Collapse others
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={expanded.length === 0}
            onClick={collapseAll}
          >
            Collapse all
          </Button>
        </div>
      </div>
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
      {fallback && location && (
        <InlineMessage status={fallback.failed ? "error" : "warning"}>
          {fallback.failed
            ? `Couldn’t open the folder ${location}, so here are all files.`
            : `There’s no folder ${location} in this dataset, so here are all files.`}
        </InlineMessage>
      )}
      <div className="dataset-files-folder">
        <div className="dataset-files-location">
          <Breadcrumbs
            label="Folder"
            items={folderCrumbs(current, hrefFor)}
            onNavigate={(href) => onNavigate(href)}
          />
          <IconButton
            icon="link"
            label="Copy link to this folder"
            variant="ghost"
            size="sm"
            tooltipPlacement="left"
            onClick={() => onCopyLink(current)}
          />
        </div>
        {nodes.length > 0 ? (
          <Tree
            label="Files in this dataset"
            nodes={nodes}
            more={{
              shown: Math.min(shown.get("") ?? PAGE, topLevelFiles.length),
              total: topLevelFiles.length,
            }}
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            selected={current || undefined}
            onSelect={(id) => {
              const file = byPath.get(id);
              setSelectedFile(file);
              // A folder you click becomes the current one, open or not.
              if (file && kindOf(file) === "folder") open(id);
            }}
            onOpen={(node) => {
              const file = byPath.get(node.id);
              if (file) onOpenFile(file);
            }}
            onShowMore={(node) => {
              const path = node?.id ?? "";
              setShown((all) =>
                new Map(all).set(path, (all.get(path) ?? PAGE) + PAGE),
              );
            }}
            onRetry={(node) => load(node.id).catch(() => {})}
            guides
            pinOpenFolders
            rowAction={(node) =>
              node.kind === "folder"
                ? {
                    icon: "link",
                    label: `Copy link to ${node.name}`,
                    onClick: () => onCopyLink(node.id),
                  }
                : undefined
            }
          />
        ) : (
          <p className="dataset-files-hint">No files in this dataset.</p>
        )}
      </div>
    </div>
  );
};

export default DatasetMainTab;
