// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADDRESS_CHANGED,
  ShareAddress,
  tabSettings,
  type ShareRegistry,
} from "./shareAddress";

const tab = (name: string, linked = ""): ShareRegistry => ({
  tab: name,
  linked: new URLSearchParams(linked),
  views: new Map(),
});
const separation = (value: string) => [
  { key: "separation", value, default: "0", label: "separation" },
];

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState({ idx: 3 }, "", "/nwb?url=f&tab=/a&channels=8");
});
afterEach(() => vi.useRealTimers());

describe("ShareAddress", () => {
  it("shows the active tab and its changed settings, replacing the history entry", () => {
    const address = new ShareAddress({ url: "f" });
    const a = tab("/a");
    address.add(a);
    const length = window.history.length;
    address.activate("/a");
    expect(window.location.search).toBe("?url=f&tab=/a");
    a.views.set("v", separation("2"));
    address.changed("/a");
    expect(window.location.search).toBe("?url=f&tab=/a");
    vi.advanceTimersByTime(300);
    expect(window.location.search).toBe("?url=f&tab=/a&separation=2");
    expect(window.history.length).toBe(length);
    expect(window.history.state).toEqual({ idx: 3 });
  });

  it("says when it rewrites the address, and only then", () => {
    const heard = vi.fn();
    window.addEventListener(ADDRESS_CHANGED, heard);
    const address = new ShareAddress({ url: "f" });
    address.add(tab("/a"));
    address.activate("/a");
    expect(heard).toHaveBeenCalledTimes(1);
    address.activate("/a");
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(ADDRESS_CHANGED, heard);
  });

  it("equals what Copy link builds", () => {
    const address = new ShareAddress({ url: "f" });
    const a = tab("/a");
    a.views.set("v", separation("3"));
    address.add(a);
    address.activate("/a");
    expect(window.location.href).toBe(address.link("/a"));
  });

  it("ignores changes in a tab that isn't shown, and drops the tab for the main view", () => {
    const address = new ShareAddress({ url: "f" });
    const a = tab("/a");
    const b = tab("/b");
    address.add(a);
    address.add(b);
    address.activate("/a");
    b.views.set("v", separation("4"));
    address.changed("/b");
    vi.advanceTimersByTime(300);
    expect(window.location.search).toBe("?url=f&tab=/a");
    address.activate("/b");
    expect(window.location.search).toBe("?url=f&tab=/b&separation=4");
    address.activate(null);
    expect(window.location.search).toBe("?url=f");
  });

  it("keeps a link's settings that no view has taken up yet", () => {
    const opened = tab("/a", "url=f&tab=/a&channels=8-15&separation=2");
    opened.views.set("v", separation("0"));
    expect(tabSettings(opened).map((s) => [s.key, s.value])).toEqual([
      ["separation", "0"],
      ["channels", "8-15"],
    ]);
  });

  it("gives a setting views share once, preferring a changed value", () => {
    const shared = tab("/a");
    shared.views.set("1", [
      { key: "speed", value: "1", default: "1", label: "speed" },
    ]);
    shared.views.set("2", [
      { key: "speed", value: "4", default: "1", label: "speed" },
    ]);
    expect(tabSettings(shared)).toEqual([
      { key: "speed", value: "4", default: "1", label: "speed" },
    ]);
  });
});
