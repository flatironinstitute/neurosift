import {
  createTabsReducer,
  type BaseTab,
  type BaseTabsState,
} from "@components/tabs/tabsReducer";
import { describe, expect, it } from "vitest";

const tab = (id: string): BaseTab => ({ id, label: id, type: "test" });

const stateWith = (
  ids: string[],
  activeTabId: string,
): BaseTabsState<BaseTab> => ({ tabs: ids.map(tab), activeTabId });

describe("createTabsReducer", () => {
  const reducer = createTabsReducer<BaseTab, { type: string }>();

  it("switches the active tab", () => {
    const next = reducer(stateWith(["a", "b"], "a"), {
      type: "SWITCH_TO_TAB",
      id: "b",
    });
    expect(next.activeTabId).toBe("b");
    expect(next.tabs.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("removes a closed tab without disturbing the active one", () => {
    const next = reducer(stateWith(["a", "b", "c"], "c"), {
      type: "CLOSE_TAB",
      id: "a",
    });
    expect(next.tabs.map((t) => t.id)).toEqual(["b", "c"]);
    expect(next.activeTabId).toBe("c");
  });

  it("falls back to the last remaining tab when the active tab is closed", () => {
    const next = reducer(stateWith(["a", "b", "c"], "b"), {
      type: "CLOSE_TAB",
      id: "b",
    });
    expect(next.activeTabId).toBe("c");
  });

  it("falls back to main when the last tab is closed", () => {
    const next = reducer(stateWith(["a"], "a"), { type: "CLOSE_TAB", id: "a" });
    expect(next.tabs).toEqual([]);
    expect(next.activeTabId).toBe("main");
  });

  it("returns the state unchanged for unknown actions", () => {
    const state = stateWith(["a"], "a");
    expect(reducer(state, { type: "SOMETHING_ELSE" })).toBe(state);
  });

  it("lets a custom reducer handle its own actions first", () => {
    type Action = { type: "OPEN_TAB"; id: string };
    const withCustom = createTabsReducer<BaseTab, Action>((state, action) =>
      action.type === "OPEN_TAB"
        ? { tabs: [...state.tabs, tab(action.id)], activeTabId: action.id }
        : state,
    );

    const next = withCustom(stateWith(["a"], "a"), {
      type: "OPEN_TAB",
      id: "b",
    });
    expect(next.tabs.map((t) => t.id)).toEqual(["a", "b"]);
    expect(next.activeTabId).toBe("b");

    // Base actions still work when a custom reducer is supplied.
    expect(withCustom(next, { type: "CLOSE_TAB", id: "b" }).activeTabId).toBe(
      "a",
    );
  });
});
