import { describe, expect, it, vi } from "vitest";

const fakePlugins: { [name: string]: { name: string } } = {
  PSTH: { name: "PSTH" },
  Raster: { name: "Raster" },
};
vi.mock("./plugins/registry", () => ({
  findPluginByName: (name: string) => fakePlugins[name],
}));

const { default: tabsReducer, getPathsAndPlugins } =
  await import("./tabsReducer");

describe("getPathsAndPlugins", () => {
  it("keeps plugins and secondary paths aligned with paths", () => {
    const { paths, plugins, secondaryPathsList } = getPathsAndPlugins([
      "/acquisition/ts",
      "PSTH|/intervals/trials^/units",
      "/processing/behavior",
      "Raster|/units",
    ]);
    expect(paths).toEqual([
      "/acquisition/ts",
      "/intervals/trials",
      "/processing/behavior",
      "/units",
    ]);
    expect(plugins.map((p) => p?.name)).toEqual([
      undefined,
      "PSTH",
      undefined,
      "Raster",
    ]);
    expect(secondaryPathsList).toEqual([undefined, ["/units"], undefined, []]);
  });
});

describe("tabsReducer OPEN_MULTI_TAB", () => {
  it("builds a multi tab whose arrays line up item by item", () => {
    const state = tabsReducer(
      { tabs: [], activeTabId: "widgets" },
      {
        type: "OPEN_MULTI_TAB",
        paths: ["/acquisition/ts", "PSTH|/intervals/trials^/units"],
        objectTypes: ["group", "group"],
      },
    );
    expect(state.tabs).toHaveLength(1);
    const tab = state.tabs[0];
    if (tab.type !== "multi") throw new Error("expected a multi tab");
    expect(tab.paths).toEqual(["/acquisition/ts", "/intervals/trials"]);
    expect(tab.plugins.map((p) => p?.name)).toEqual([undefined, "PSTH"]);
    expect(tab.secondaryPathsList).toEqual([undefined, ["/units"]]);
    expect(tab.objectTypes).toEqual(["group", "group"]);
    expect(state.activeTabId).toBe(tab.id);
  });

  it("reactivates an existing tab for the same items", () => {
    const first = tabsReducer(
      { tabs: [], activeTabId: "widgets" },
      {
        type: "OPEN_MULTI_TAB",
        paths: ["/a", "/b"],
        objectTypes: ["group", "dataset"],
      },
    );
    const second = tabsReducer(
      { ...first, activeTabId: "widgets" },
      {
        type: "OPEN_MULTI_TAB",
        paths: ["/a", "/b"],
        objectTypes: ["group", "dataset"],
      },
    );
    expect(second.tabs).toHaveLength(1);
    expect(second.activeTabId).toBe(first.tabs[0].id);
  });
});
