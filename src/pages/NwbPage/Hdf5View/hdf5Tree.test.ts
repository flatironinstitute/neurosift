import { describe, expect, it } from "vitest";
import type { Hdf5Group } from "../hdf5Interface";
import {
  datasetMeta,
  dtypeWords,
  filterTree,
  findDataset,
  groupMeta,
  itemBytes,
  treeNodes,
  valueText,
  type GroupMap,
} from "./hdf5Tree";

const group = (path: string, sub: string[], ds: string[] = []): Hdf5Group => ({
  path,
  attrs: {},
  subgroups: sub.map((name) => ({
    name,
    path: `${path === "/" ? "" : path}/${name}`,
    attrs: name === "LFPs" ? { neurodata_type: "ElectricalSeries" } : {},
  })),
  datasets: ds.map((name) => ({
    name,
    path: `${path === "/" ? "" : path}/${name}`,
    dtype: "<f8",
    shape: [550276, 70],
    attrs: {},
  })),
});

const GROUPS: GroupMap = {
  "/": group("/", ["acquisition", "scratch"], ["identifier"]),
  "/acquisition": group("/acquisition", ["LFPs"]),
  "/acquisition/LFPs": group("/acquisition/LFPs", [], ["data", "electrodes"]),
  "/scratch": group("/scratch", []),
};

describe("hdf5Tree", () => {
  it("names dtypes in words and sizes", () => {
    expect(dtypeWords("<f8")).toBe("64-bit float");
    expect(dtypeWords("<i4")).toBe("32-bit integer");
    expect(dtypeWords("<U17")).toBe("text, up to 17 characters");
    expect(dtypeWords("weird")).toBeUndefined();
    expect(itemBytes("<f8")).toBe(8);
    expect(itemBytes("<U3")).toBe(12);
  });

  it("writes a dataset's dtype and shape, and a group's type and contents", () => {
    expect(datasetMeta(GROUPS["/"].datasets[0])).toBe("<f8 · 550,276 × 70");
    expect(
      groupMeta(GROUPS["/acquisition/LFPs"], {
        neurodata_type: "ElectricalSeries",
      }),
    ).toBe("ElectricalSeries · 2 datasets");
    expect(groupMeta(GROUPS["/acquisition"], {})).toBe("1 item");
    expect(groupMeta(GROUPS["/scratch"], {})).toBe("Empty");
    expect(groupMeta(undefined, {})).toBeUndefined();
  });

  it("builds groups before datasets, with unread groups left unopened", () => {
    const nodes = treeNodes(GROUPS, "/");
    expect(nodes.map((n) => n.id)).toEqual([
      "/acquisition",
      "/scratch",
      "/identifier",
    ]);
    expect(nodes[1].children).toEqual([]);
    const lfps = nodes[0].children![0];
    expect(lfps.size).toBe("ElectricalSeries · 2 datasets");
    expect(lfps.children!.map((n) => n.name)).toEqual(["data", "electrodes"]);
  });

  it("filters to matches with their parents, opening the way to them", () => {
    const { nodes, open } = filterTree(treeNodes(GROUPS, "/"), "electro");
    expect(nodes.map((n) => n.id)).toEqual(["/acquisition"]);
    expect(nodes[0].children![0].children!.map((n) => n.name)).toEqual([
      "electrodes",
    ]);
    expect(open.sort()).toEqual(["/acquisition", "/acquisition/LFPs"]);
    expect(filterTree(treeNodes(GROUPS, "/"), "spikes").nodes).toEqual([]);
  });

  it("finds a dataset by path and writes values as text", () => {
    expect(findDataset(GROUPS, "/acquisition/LFPs/data")?.name).toBe("data");
    expect(valueText(new Float64Array([1, 2.5]))).toBe("1, 2.5");
    expect(valueText(BigInt(3))).toBe("3");
    expect(valueText({ a: BigInt(1) })).toBe('{"a":"1"}');
  });
});
