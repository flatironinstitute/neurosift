import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import { IconButton } from "../IconButton/IconButton";
import { Spinner } from "../Spinner/Spinner";
import "./Tree.css";

/** The first `shown` of `total` items are listed; the rest come with Show more. */
export interface TreeMore {
  shown: number;
  total: number;
}

export interface TreeNode {
  id: string;
  name: string;
  kind: "folder" | "nwb" | "file";
  /** A file's size, or a folder's count of files. */
  size?: string;
  /** Leave out for a folder whose contents aren't loaded yet. */
  children?: TreeNode[];
  /** An open folder whose contents are loading, or failed to load. */
  status?: "loading" | "error";
  more?: TreeMore;
}

export interface TreeRowAction {
  icon: IconName;
  label: string;
  onClick: () => void;
}

interface TreeProps {
  label: string;
  nodes: TreeNode[];
  expanded: string[];
  onExpandedChange: (expanded: string[]) => void;
  selected?: string;
  onSelect: (id: string) => void;
  /** Opens a file: an NWB file in the viewer, others to their details. */
  onOpen?: (node: TreeNode) => void;
  /** Moves into a folder instead of expanding it, for a list of one folder at a time. */
  onOpenFolder?: (node: TreeNode) => void;
  /** The top level is partial too. */
  more?: TreeMore;
  moreStep?: number;
  /** Shows more of a folder, or of the top level when called without one. */
  onShowMore?: (folder?: TreeNode) => void;
  onRetry?: (folder: TreeNode) => void;
  /** A line under each open folder, from its chevron to its last row. */
  guides?: boolean;
  /** Open folders stay at the top while their contents scroll past. */
  pinOpenFolders?: boolean;
  /** A button shown on hover, for pointers; keyboard users need another way to the same action. */
  rowAction?: (node: TreeNode) => TreeRowAction | undefined;
}

type Row =
  | {
      type: "node";
      id: string;
      node: TreeNode;
      level: number;
      parent?: string;
      size: number;
      position: number;
    }
  | {
      type: "loading" | "error" | "more";
      id: string;
      folder?: TreeNode;
      level: number;
      parent?: string;
    };

// A folder known to be empty has nothing to open.
const opens = (node: TreeNode) =>
  node.kind === "folder" && node.children?.length !== 0;

const KIND_ICONS: Record<TreeNode["kind"], IconName> = {
  folder: "folder",
  nwb: "data--structured",
  file: "document",
};

/** Folders and files, or HDF5 groups and datasets. The whole row is the target, and it follows the tree view keys. */
export function Tree({
  label,
  nodes,
  expanded,
  onExpandedChange,
  selected,
  onSelect,
  onOpen,
  onOpenFolder,
  more,
  moreStep = 25,
  onShowMore,
  onRetry,
  guides = false,
  pinOpenFolders = false,
  rowAction,
}: TreeProps) {
  const expands = (node: TreeNode) => !onOpenFolder && opens(node);
  const isOpen = (node: TreeNode) =>
    expands(node) && expanded.includes(node.id);

  // Every visible row in order, for the keys; the markup nests them in groups.
  const rows: Row[] = [];
  const walk = (
    list: TreeNode[],
    level: number,
    folder?: TreeNode,
    listMore?: TreeMore,
  ) => {
    list.forEach((node, index) => {
      rows.push({
        type: "node",
        id: node.id,
        node,
        level,
        parent: folder?.id,
        size: list.length,
        position: index + 1,
      });
      if (isOpen(node)) {
        if (node.status)
          rows.push({
            type: node.status,
            id: `${node.id}::${node.status}`,
            folder: node,
            level: level + 1,
            parent: node.id,
          });
        else walk(node.children ?? [], level + 1, node, node.more);
      }
    });
    if (listMore && listMore.shown < listMore.total)
      rows.push({
        type: "more",
        id: `${folder?.id ?? ""}::more`,
        folder,
        level,
        parent: folder?.id,
      });
  };
  walk(nodes, 1, undefined, more);

  const [active, setActive] = useState<string>();
  const current =
    rows.find((r) => r.id === active) ??
    rows.find((r) => r.id === selected) ??
    rows[0];

  const focus = (id: string) => {
    setActive(id);
    document.getElementById(`tree-${id}`)?.focus();
  };
  const setOpen = (id: string, open: boolean) =>
    onExpandedChange(
      open ? [...expanded, id] : expanded.filter((e) => e !== id),
    );
  const activate = (row: Row) => {
    if (row.type !== "node") {
      if (row.type === "more") onShowMore?.(row.folder);
      else if (row.type === "error" && row.folder) onRetry?.(row.folder);
      return;
    }
    const { node } = row;
    if (onOpenFolder && node.kind === "folder") onOpenFolder(node);
    else if (opens(node)) setOpen(node.id, !expanded.includes(node.id));
    else onOpen?.(node);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.target !== event.currentTarget) return;
    const row = rows[index];
    const node = row.type === "node" ? row.node : undefined;
    const open = node !== undefined && isOpen(node);
    const moves: Record<string, () => void> = {
      ArrowDown: () => rows[index + 1] && focus(rows[index + 1].id),
      ArrowUp: () => rows[index - 1] && focus(rows[index - 1].id),
      Home: () => focus(rows[0].id),
      End: () => focus(rows[rows.length - 1].id),
      ArrowRight: () => {
        if (!node || !expands(node)) return;
        if (!open) setOpen(node.id, true);
        else if (rows[index + 1]?.parent === node.id) focus(rows[index + 1].id);
      },
      ArrowLeft: () => {
        if (node && open) setOpen(node.id, false);
        else if (row.parent) focus(row.parent);
      },
      Enter: () => activate(row),
      " ": () => (node ? onSelect(node.id) : activate(row)),
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    moves[event.key]();
  };

  const indents = (level: number) =>
    Array.from({ length: level - 1 }, (_, i) => (
      <span key={i} className="ns-tree-indent" />
    ));

  const item = (
    row: Row,
    content: ReactNode,
    children?: ReactNode,
    extra?: object,
  ) => {
    const index = rows.indexOf(row);
    return (
      <li
        key={row.id}
        id={`tree-${row.id}`}
        role="treeitem"
        aria-level={row.level}
        tabIndex={row.id === current?.id ? 0 : -1}
        className="ns-tree-item"
        data-level={row.level}
        onKeyDown={(event) => onKeyDown(event, index)}
        onClick={(event) => {
          // A click inside a nested item belongs to that item.
          if (
            (event.target as Element).closest('[role="treeitem"]') !==
            event.currentTarget
          )
            return;
          setActive(row.id);
          if (row.type === "node") onSelect(row.id);
          activate(row);
        }}
        {...extra}
      >
        <div className="ns-tree-row">
          {indents(row.level)}
          {content}
        </div>
        {children}
      </li>
    );
  };

  const statusRow = (row: Exclude<Row, { type: "node" }>) => {
    if (row.type === "loading")
      return item(
        row,
        <>
          <span className="ns-tree-chevron" />
          <Spinner />
          <span className="ns-tree-name ns-tree-note">Loading…</span>
        </>,
        undefined,
        { "aria-busy": true, "aria-disabled": true },
      );
    if (row.type === "error")
      return item(
        row,
        <>
          <span className="ns-tree-chevron" />
          <Icon name="error" />
          <span className="ns-tree-name ns-tree-note">
            Couldn’t load this folder.
          </span>
          <span className="ns-tree-retry">Try again</span>
        </>,
      );
    const listMore = row.folder ? row.folder.more : more;
    const count = listMore
      ? Math.min(moreStep, listMore.total - listMore.shown)
      : 0;
    return item(
      row,
      <>
        <span className="ns-tree-chevron" />
        <span className="ns-tree-name ns-tree-more">{`Show ${count} more`}</span>
        <span className="ns-tree-size">
          {listMore
            ? `${listMore.shown.toLocaleString()} of ${listMore.total.toLocaleString()} shown`
            : ""}
        </span>
      </>,
    );
  };

  const nodeRow = (row: Extract<Row, { type: "node" }>, below: ReactNode) => {
    const { node } = row;
    const folder = expands(node);
    const open = isOpen(node);
    const action = rowAction?.(node);
    return item(
      row,
      <>
        <span className="ns-tree-chevron">
          {folder && <Icon name={open ? "chevron--down" : "chevron--right"} />}
        </span>
        <Icon name={open ? "folder--open" : KIND_ICONS[node.kind]} />
        <span className="ns-tree-name">{node.name}</span>
        {node.size && <span className="ns-tree-size">{node.size}</span>}
        {action && (
          <span
            className="ns-tree-action"
            onClick={(event) => event.stopPropagation()}
          >
            <IconButton
              icon={action.icon}
              label={action.label}
              variant="ghost"
              size="sm"
              tabIndex={-1}
              aria-hidden
              onClick={action.onClick}
            />
          </span>
        )}
      </>,
      below,
      {
        "aria-setsize": row.size,
        "aria-posinset": row.position,
        "aria-expanded": folder ? open : undefined,
        "aria-selected": node.id === selected,
      },
    );
  };

  // Renders the rows from `start` that sit at `level`, with each open folder's rows in a group.
  const render = (start: number, level: number): [ReactNode[], number] => {
    const out: ReactNode[] = [];
    let i = start;
    while (i < rows.length && rows[i].level >= level) {
      const row = rows[i];
      if (row.type !== "node") {
        out.push(statusRow(row));
        i += 1;
        continue;
      }
      let group: ReactNode;
      i += 1;
      if (isOpen(row.node)) {
        const [children, next] = render(i, level + 1);
        group = children.length > 0 ? <ul role="group">{children}</ul> : null;
        i = next;
      }
      out.push(nodeRow(row, group));
    }
    return [out, i];
  };

  const classes = [
    "ns-tree",
    guides && "ns-tree--guides",
    pinOpenFolders && "ns-tree--pinned",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <ul role="tree" aria-label={label} className={classes}>
      {render(0, 1)[0]}
    </ul>
  );
}
