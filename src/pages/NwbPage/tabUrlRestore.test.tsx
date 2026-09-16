// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Resolve object types on a later tick, the way the real network lookup does.
vi.mock("./ObjectTypeUtils", () => ({
  determineObjectType: async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return "group";
  },
}));
vi.mock("./plugins/registry", () => ({
  findPluginByName: (name: string) => ({ name }),
}));

const { useTabManager } = await import("./TabManager");
const { useSyncTabToUrl } = await import("./useSyncTabToUrl");

// The wiring MainWorkspace has: the tab to restore comes from ?tab=, and the
// active tab is mirrored back into ?tab=. Before the restore finishes, the
// active tab is still the default Widgets tab.
let openTabIds: string[] = [];

const Workspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTabId = searchParams.get("tab") || undefined;
  const { tabsState } = useTabManager({ nwbUrl: "u", initialTabId });
  openTabIds = tabsState.tabs.map((t) => t.id);
  const isDynamicTabActive = tabsState.tabs.some(
    (t) => t.id === tabsState.activeTabId,
  );
  const restorePending =
    !!initialTabId && !tabsState.tabs.some((t) => t.id === initialTabId);
  const activeTab = isDynamicTabActive ? tabsState.activeTabId : "widgets";
  useSyncTabToUrl(activeTab, {
    enabled: !(restorePending && activeTab === "widgets"),
  });
  return null;
};

describe("restoring the tab named by the URL", () => {
  beforeEach(() => {
    openTabIds = [];
  });

  it("opens a plugin view from ?tab= and keeps the parameter", async () => {
    const tab = "view:EventRelatedSignal|/intervals/trials^/acquisition/x";
    window.history.replaceState(
      null,
      "",
      `/nwb?url=https://example.org/f.nwb&tab=${encodeURIComponent(tab)}`,
    );
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );
    await waitFor(() => expect(openTabIds).toEqual([tab]));
    expect(new URLSearchParams(window.location.search).get("tab")).toBe(tab);
  });

  it("opens a plain object path from ?tab= and keeps the parameter", async () => {
    const tab = "/acquisition/x";
    window.history.replaceState(
      null,
      "",
      `/nwb?url=https://example.org/f.nwb&tab=${encodeURIComponent(tab)}`,
    );
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );
    await waitFor(() => expect(openTabIds).toEqual([tab]));
    expect(new URLSearchParams(window.location.search).get("tab")).toBe(tab);
  });

  it("drops the parameter once the workspace is really on the widgets tab", async () => {
    window.history.replaceState(null, "", "/nwb?url=https://example.org/f.nwb");
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get("url")).toBe(
        "https://example.org/f.nwb",
      ),
    );
    expect(new URLSearchParams(window.location.search).get("tab")).toBeNull();
  });
});
