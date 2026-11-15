import { createContext } from "react";

/** Which player is moving a time window, so only one plays it at a time. */
export type PlaybackOwner = {
  current: () => string | undefined;
  /** Takes the window if no other player holds it. */
  claim: (id: string) => boolean;
  release: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createPlaybackOwner(): PlaybackOwner {
  let holder: string | undefined;
  const listeners = new Set<() => void>();
  const set = (next: string | undefined) => {
    holder = next;
    listeners.forEach((listener) => listener());
  };
  return {
    current: () => holder,
    claim: (id) => {
      if (holder !== undefined && holder !== id) return false;
      if (holder !== id) set(id);
      return true;
    },
    release: (id) => {
      if (holder === id) set(undefined);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const PlaybackOwnerContext = createContext<PlaybackOwner | undefined>(
  undefined,
);
