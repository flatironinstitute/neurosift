/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TreeNode } from "@ui";
import type { Hdf5Group, Hdf5Subdataset } from "../hdf5Interface";

export type GroupMap = Record<string, Hdf5Group>;

const count = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) =>
  `${count(n)} ${word}${n === 1 ? "" : "s"}`;

/** The dtype in words, such as "64-bit float" for <f8. */
export function dtypeWords(dtype: string): string | undefined {
  const match = /^[<>|=]?([a-zA-Z])(\d*)$/.exec(dtype);
  if (!match) return undefined;
  const [, kind, digits] = match;
  const n = Number(digits);
  switch (kind) {
    case "f":
      return `${n * 8}-bit float`;
    case "i":
      return `${n * 8}-bit integer`;
    case "u":
      return `${n * 8}-bit unsigned integer`;
    case "b":
      return "true or false";
    case "U":
      return `text, up to ${n} characters`;
    case "S":
      return `bytes, up to ${n}`;
    case "O":
      return "object";
    default:
      return undefined;
  }
}

/** Bytes per value, when the dtype says. */
export function itemBytes(dtype: string): number | undefined {
  const match = /^[<>|=]?([fiubSU])(\d+)$/.exec(dtype);
  if (!match) return undefined;
  return match[1] === "U" ? Number(match[2]) * 4 : Number(match[2]);
}

export const valueCount = (shape: number[]) =>
  shape.reduce((product, n) => product * n, 1);

export const shapeText = (shape: number[]) =>
  shape.length === 0 ? "scalar" : shape.map(count).join(" × ");

export const datasetMeta = (ds: Hdf5Subdataset) =>
  `${ds.dtype} · ${shapeText(ds.shape)}`;

/** A group's type and contents, or Empty; just the type until it's read. */
export function groupMeta(
  group: Hdf5Group | undefined,
  attrs: Record<string, any>,
): string | undefined {
  const type: string | undefined = attrs.neurodata_type;
  if (!group) return type;
  const groups = group.subgroups.length;
  const datasets = group.datasets.length;
  const contents =
    groups + datasets === 0
      ? "Empty"
      : groups === 0
        ? plural(datasets, "dataset")
        : plural(groups + datasets, "item");
  return type ? `${type} · ${contents}` : contents;
}

/** The tree under a group: groups first, then datasets, as stored. Unread groups have no children yet. */
export function treeNodes(groups: GroupMap, path: string): TreeNode[] {
  const group = groups[path];
  if (!group) return [];
  return [
    ...group.subgroups.map((sg): TreeNode => {
      const loaded = groups[sg.path];
      return {
        id: sg.path,
        name: sg.name,
        kind: "folder",
        size: groupMeta(loaded, sg.attrs),
        children: loaded ? treeNodes(groups, sg.path) : undefined,
      };
    }),
    ...group.datasets.map(
      (ds): TreeNode => ({
        id: ds.path,
        name: ds.name,
        kind: "file",
        size: datasetMeta(ds),
      }),
    ),
  ];
}

/** Keeps nodes whose name or path matches, with their parents; returns the folders to open. */
export function filterTree(
  nodes: TreeNode[],
  query: string,
): { nodes: TreeNode[]; open: string[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { nodes, open: [] };
  const open: string[] = [];
  const walk = (list: TreeNode[]): TreeNode[] =>
    list.flatMap((node) => {
      const kept = node.children ? walk(node.children) : [];
      const hit =
        node.name.toLowerCase().includes(q) ||
        node.id.toLowerCase().includes(q);
      if (kept.length > 0) {
        open.push(node.id);
        return [{ ...node, children: kept }];
      }
      // A matching folder keeps its own contents, closed.
      return hit ? [node] : [];
    });
  return { nodes: walk(nodes), open };
}

export const parentPath = (path: string) =>
  path.lastIndexOf("/") <= 0 ? "/" : path.slice(0, path.lastIndexOf("/"));

export const findDataset = (groups: GroupMap, path: string) =>
  groups[parentPath(path)]?.datasets.find((d) => d.path === path);

/** An attribute or small dataset as text: arrays joined, objects as JSON. */
export function valueText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (ArrayBuffer.isView(value) && !(value instanceof DataView))
    return Array.from(value as unknown as ArrayLike<unknown>)
      .map(valueText)
      .join(", ");
  if (Array.isArray(value)) return value.map(valueText).join(", ");
  return JSON.stringify(value, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}
