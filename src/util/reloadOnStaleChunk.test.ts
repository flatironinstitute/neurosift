import { describe, expect, it, vi } from "vitest";
import { installStaleChunkReload } from "./reloadOnStaleChunk";

const setup = () => {
  const target = new EventTarget();
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  const reload = vi.fn();
  let time = 1_000_000;
  installStaleChunkReload({ target, storage, reload, now: () => time });
  return {
    reload,
    fail: () => target.dispatchEvent(new Event("vite:preloadError")),
    advance: (ms: number) => (time += ms),
  };
};

describe("installStaleChunkReload", () => {
  it("reloads the page when a chunk fails to load", () => {
    const { reload, fail } = setup();
    fail();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload again right after a reload", () => {
    const { reload, fail, advance } = setup();
    fail();
    advance(5_000);
    fail();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads again for a failure well after the last reload", () => {
    const { reload, fail, advance } = setup();
    fail();
    advance(10 * 60 * 1000);
    fail();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when storage is unavailable", () => {
    const target = new EventTarget();
    const reload = vi.fn();
    installStaleChunkReload({
      target,
      reload,
      storage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {},
      },
    });
    target.dispatchEvent(new Event("vite:preloadError"));
    expect(reload).not.toHaveBeenCalled();
  });
});
