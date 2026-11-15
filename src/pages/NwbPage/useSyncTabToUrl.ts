import { useEffect } from "react";
import type { ShareAddress } from "@shared/shareLink/shareAddress";
import { useSetSearchParamsKeepingHash } from "./urlHash";

// Mirrors the active tab into the ?tab= search parameter, omitting it for
// the default Widgets tab. This goes through react-router rather than
// history.replaceState so that other views which rewrite the search params
// from the router's copy see the current tab
// and keep it, instead of dropping it from a stale copy. The setter keeps the
// URL hash.
//
// `enabled` must be false while the tab named by the URL is still being
// restored. Until that finishes the active tab is still the default Widgets
// tab, and writing that out would delete the very ?tab= parameter the restore
// is reading -- which also aborts it, since the restore re-runs (cancelling
// its in-flight lookup) whenever that parameter changes.
export const useSyncTabToUrl = (
  tabId: string,
  {
    enabled = true,
    address,
  }: {
    enabled?: boolean;
    /** Writes the tab with its settings instead, replacing the history entry. */
    address?: ShareAddress;
  } = {},
) => {
  const setSearchParams = useSetSearchParamsKeepingHash();
  useEffect(() => {
    if (!enabled) return;
    if (address) {
      address.activate(tabId === "widgets" ? null : tabId);
      return;
    }
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
  }, [tabId, enabled, address, setSearchParams]);
};
