// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useSyncTabToUrl } from "./useSyncTabToUrl";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={["/nwb?url=https://example.org/f.nwb"]}>
    {children}
  </MemoryRouter>
);

// A stand-in for a child view that rewrites the search params from the
// router's copy, the way the icephys and video views do.
const useHookAndParams = ({ tab }: { tab: string }) => {
  useSyncTabToUrl(tab);
  const [searchParams, setSearchParams] = useSearchParams();
  return { searchParams, setSearchParams };
};

describe("useSyncTabToUrl", () => {
  it("omits the tab parameter for the widgets tab", () => {
    const { result } = renderHook(useHookAndParams, {
      wrapper,
      initialProps: { tab: "widgets" },
    });
    expect(result.current.searchParams.get("tab")).toBeNull();
    expect(result.current.searchParams.get("url")).toBe(
      "https://example.org/f.nwb",
    );
  });

  it("writes the active tab where the router can see it", () => {
    const { result, rerender } = renderHook(useHookAndParams, {
      wrapper,
      initialProps: { tab: "widgets" },
    });
    rerender({ tab: "video-widget" });
    expect(result.current.searchParams.get("tab")).toBe("video-widget");
    expect(result.current.searchParams.get("url")).toBe(
      "https://example.org/f.nwb",
    );
    rerender({ tab: "widgets" });
    expect(result.current.searchParams.get("tab")).toBeNull();
  });

  it("survives another view rewriting the params from the router's copy", () => {
    const { result, rerender } = renderHook(useHookAndParams, {
      wrapper,
      initialProps: { tab: "icephys" },
    });
    expect(result.current.searchParams.get("tab")).toBe("icephys");
    act(() => {
      result.current.setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("icephysLockY", "1");
          return next;
        },
        { replace: true },
      );
    });
    expect(result.current.searchParams.get("icephysLockY")).toBe("1");
    expect(result.current.searchParams.get("tab")).toBe("icephys");
    rerender({ tab: "icephys" });
    expect(result.current.searchParams.get("tab")).toBe("icephys");
  });
});
