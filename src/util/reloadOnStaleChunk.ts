// Pages and views are loaded as separate chunks. After a deploy, a tab that is
// still running the previous build asks for chunk files that no longer exist,
// and Vite reports the failed import as a "vite:preloadError" event. Reloading
// the page picks up the new build. The stored timestamp stops a chunk that is
// missing for some other reason from reloading the page in a loop.
const LAST_RELOAD_KEY = "neurosift-stale-chunk-reload";
const MIN_RELOAD_INTERVAL_MS = 60 * 1000;

type Options = {
  target: Pick<EventTarget, "addEventListener">;
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
  now: () => number;
};

export const installStaleChunkReload = (o?: Partial<Options>) => {
  const target = o?.target ?? window;
  const reload = o?.reload ?? (() => window.location.reload());
  const now = o?.now ?? Date.now;

  target.addEventListener("vite:preloadError", () => {
    try {
      const storage = o?.storage ?? window.sessionStorage;
      const last = Number(storage.getItem(LAST_RELOAD_KEY));
      if (last && now() - last < MIN_RELOAD_INTERVAL_MS) return;
      storage.setItem(LAST_RELOAD_KEY, String(now()));
    } catch {
      // Without storage there is no way to tell a loop from a first failure,
      // so leave the error to surface instead of reloading.
      return;
    }
    reload();
  });
};
