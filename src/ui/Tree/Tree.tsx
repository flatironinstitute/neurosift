import { useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import "./Tree.css";

export interface TreeNode {
  id: string;
  name: string;
  kind: "folder" | "nwb" | "file";
  /** A file's size, or a folder's count of files. */
  size?: string;
  /** Leave out for a folder whose contents aren't loaded yet. */
  children?: TreeNode[];
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
}

type Row = {
  node: TreeNode;
  level: number;
  parent?: string;
  size: number;
  position: number;
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
}: TreeProps) {
  const rows: Row[] = [];
  const walk = (list: TreeNode[], level: number, parent?: string) =>
    list.forEach((node, index) => {
      rows.push({
        node,
        level,
        parent,
        size: list.length,
        position: index + 1,
      });
      if (node.kind === "folder" && expanded.includes(node.id))
        walk(node.children ?? [], level + 1, node.id);
    });
  walk(nodes, 1);

  const [active, setActive] = useState<string>();
  const current =
    rows.find((r) => r.node.id === active) ??
    rows.find((r) => r.node.id === selected) ??
    rows[0];

  const focus = (id: string) => {
    setActive(id);
    document.getElementById(`tree-${id}`)?.focus();
  };
  const setOpen = (id: string, open: boolean) =>
    onExpandedChange(
      open ? [...expanded, id] : expanded.filter((e) => e !== id),
    );
  const activate = (node: TreeNode) => {
    if (opens(node)) setOpen(node.id, !expanded.includes(node.id));
    else onOpen?.(node);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const { node, parent } = rows[index];
    const isOpen = opens(node) && expanded.includes(node.id);
    const moves: Record<string, () => void> = {
      ArrowDown: () => rows[index + 1] && focus(rows[index + 1].node.id),
      ArrowUp: () => rows[index - 1] && focus(rows[index - 1].node.id),
      Home: () => focus(rows[0].node.id),
      End: () => focus(rows[rows.length - 1].node.id),
      ArrowRight: () => {
        if (!opens(node)) return;
        if (!isOpen) setOpen(node.id, true);
        else if (rows[index + 1]?.parent === node.id)
          focus(rows[index + 1].node.id);
      },
      ArrowLeft: () => {
        if (isOpen) setOpen(node.id, false);
        else if (parent) focus(parent);
      },
      Enter: () => activate(node),
      " ": () => onSelect(node.id),
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    moves[event.key]();
  };

  return (
    <ul role="tree" aria-label={label} className="ns-tree">
      {rows.map((row, index) => {
        const { node } = row;
        const folder = opens(node);
        const isOpen = folder && expanded.includes(node.id);
        return (
          <li
            key={node.id}
            id={`tree-${node.id}`}
            role="treeitem"
            aria-level={row.level}
            aria-setsize={row.size}
            aria-posinset={row.position}
            aria-expanded={folder ? isOpen : undefined}
            aria-selected={node.id === selected}
            tabIndex={node.id === current?.node.id ? 0 : -1}
            className="ns-tree-row"
            onClick={() => {
              setActive(node.id);
              onSelect(node.id);
              activate(node);
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {Array.from({ length: row.level - 1 }, (_, i) => (
              <span key={i} className="ns-tree-indent" />
            ))}
            <span className="ns-tree-chevron">
              {folder && (
                <Icon name={isOpen ? "chevron--down" : "chevron--right"} />
              )}
            </span>
            <Icon name={isOpen ? "folder--open" : KIND_ICONS[node.kind]} />
            <span className="ns-tree-name">{node.name}</span>
            {node.size && <span className="ns-tree-size">{node.size}</span>}
          </li>
        );
      })}
    </ul>
  );
}
