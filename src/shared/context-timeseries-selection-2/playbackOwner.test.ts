import { describe, expect, it, vi } from "vitest";
import { createPlaybackOwner } from "./playbackOwner";

describe("createPlaybackOwner", () => {
  it("lets one player hold the window at a time, until it lets go", () => {
    const owner = createPlaybackOwner();
    expect(owner.current()).toBeUndefined();
    expect(owner.claim("a")).toBe(true);
    expect(owner.claim("b")).toBe(false);
    expect(owner.current()).toBe("a");
    owner.release("b");
    expect(owner.current()).toBe("a");
    owner.release("a");
    expect(owner.current()).toBeUndefined();
    expect(owner.claim("b")).toBe(true);
  });

  it("tells subscribers when the holder changes", () => {
    const owner = createPlaybackOwner();
    const listener = vi.fn();
    const unsubscribe = owner.subscribe(listener);
    owner.claim("a");
    owner.claim("b");
    owner.release("a");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    owner.claim("b");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
