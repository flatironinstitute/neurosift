import { useEffect, useState } from "react";

/** State remembered in this browser under a key, falling back when storage is unavailable. */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : (JSON.parse(stored) as T);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private windows and blocked storage keep the value for this visit only.
    }
  }, [key, value]);
  return [value, setValue] as const;
}
