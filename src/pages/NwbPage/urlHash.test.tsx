// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import React, { useEffect } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useSyncTabToUrl } from "./useSyncTabToUrl";
import { useSetSearchParamsKeepingHash } from "./urlHash";

// A stand-in for the PSTH / Event Related Signal views, which persist their
// selections in the URL hash with a raw history.replaceState.
const HashView: React.FC<{ hash: string }> = ({ hash }) => {
  useEffect(() => {
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [hash]);
  return null;
};

let setParams: ReturnType<typeof useSetSearchParamsKeepingHash>;
let params: URLSearchParams;

const App: React.FC<{ tab: string; hash: string }> = ({ tab, hash }) => {
  useSyncTabToUrl(tab);
  [params] = useSearchParams();
  setParams = useSetSearchParamsKeepingHash();
  return <HashView hash={hash} />;
};

const renderApp = (tab: string, hash: string) =>
  render(
    <BrowserRouter>
      <App tab={tab} hash={hash} />
    </BrowserRouter>,
  );

describe("URL hash persistence", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/nwb?url=https://example.org/f.nwb");
  });

  it("keeps a view's hash while the active tab is mirrored into the URL", () => {
    const { rerender } = renderApp("widgets", "#ta_win=-1,2");
    expect(window.location.hash).toBe("#ta_win=-1,2");

    const tab = "view:EventRelatedSignal|/intervals/trials^/acquisition/x";
    rerender(
      <BrowserRouter>
        <App tab={tab} hash="#ta_win=-1,2" />
      </BrowserRouter>,
    );
    expect(params.get("tab")).toBe(tab);
    expect(params.get("url")).toBe("https://example.org/f.nwb");
    expect(window.location.hash).toBe("#ta_win=-1,2");
  });

  it("keeps a view's hash when another view rewrites the search params", () => {
    renderApp("icephys", "#ta_series=/acquisition/x");
    expect(window.location.hash).toBe("#ta_series=/acquisition/x");

    act(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("icephysLockY", "1");
          return next;
        },
        { replace: true },
      );
    });
    expect(params.get("icephysLockY")).toBe("1");
    expect(params.get("tab")).toBe("icephys");
    expect(window.location.hash).toBe("#ta_series=/acquisition/x");
  });
});
