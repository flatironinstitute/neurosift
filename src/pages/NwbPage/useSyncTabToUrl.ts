import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Mirrors the active tab into the ?tab= search parameter, omitting it for
// the default Widgets tab. This goes through react-router rather than
// history.replaceState so that other views which rewrite the search params
// from the router's copy (the icephys and video views) see the current tab
// and keep it, instead of dropping it from a stale copy.
export const useSyncTabToUrl = (tabId: string) => {
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tabId === "widgets") {
          if (!next.has("tab")) return prev;
          next.delete("tab");
        } else {
          if (next.get("tab") === tabId) return prev;
          next.set("tab", tabId);
        }
        return next;
      },
      { replace: true },
    );
  }, [tabId, setSearchParams]);
};
