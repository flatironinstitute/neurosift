// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const lookups: string[] = [];
vi.mock("../ObjectTypeUtils", () => ({
  determineObjectType: async (_url: string, path: string) => {
    lookups.push(path);
    return "group";
  },
}));
vi.mock("../plugins/registry", () => ({
  findPluginByName: (name: string) => ({ name }),
}));

const { useTabManager } = await import("./index");

describe("useTabManager", () => {
  it("opens the tab named by the URL and activates it again without a lookup", async () => {
    lookups.length = 0;
    const { result, rerender } = renderHook(
      ({ initialTabId }: { initialTabId?: string }) =>
        useTabManager({ nwbUrl: "u", initialTabId }),
      { initialProps: { initialTabId: "/acquisition/a" } },
    );
    await waitFor(() =>
      expect(
        result.current.tabsState.tabs.map((t: { id: string }) => t.id),
      ).toEqual(["/acquisition/a"]),
    );
    expect(lookups).toEqual(["/acquisition/a"]);

    await act(async () => {
      await result.current.handleOpenObjectInNewTab("/acquisition/b");
    });
    expect(result.current.tabsState.activeTabId).toBe("/acquisition/b");
    expect(lookups).toEqual(["/acquisition/a", "/acquisition/b"]);

    // The URL follows the active tab, so opening the second tab and then
    // switching back to the first arrive here as changes to initialTabId.
    rerender({ initialTabId: "/acquisition/b" });
    await waitFor(() =>
      expect(result.current.tabsState.activeTabId).toBe("/acquisition/b"),
    );
    rerender({ initialTabId: "/acquisition/a" });
    await waitFor(() =>
      expect(result.current.tabsState.activeTabId).toBe("/acquisition/a"),
    );
    expect(result.current.tabsState.tabs).toHaveLength(2);
    expect(lookups).toEqual(["/acquisition/a", "/acquisition/b"]);
  });

  it("does nothing for a fixed tab id passed as undefined", async () => {
    lookups.length = 0;
    const { result } = renderHook(
      ({ initialTabId }: { initialTabId?: string }) =>
        useTabManager({ nwbUrl: "u", initialTabId }),
      { initialProps: { initialTabId: undefined } },
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.tabsState.tabs).toHaveLength(0);
    expect(lookups).toEqual([]);
  });
});
