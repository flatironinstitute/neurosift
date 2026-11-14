// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readTheme, THEME_KEY, watchSystemTheme } from "./theme";

const system = (matches: Record<string, boolean>) => {
  const listeners: (() => void)[] = [];
  window.matchMedia = vi.fn((query: string) => ({
    matches: !!matches[query],
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  return {
    change: (next: Record<string, boolean>) => {
      Object.assign(matches, next);
      listeners.forEach((fn) => fn());
    },
  };
};

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("theme", () => {
  it("is light until another theme is saved", () => {
    expect(readTheme()).toBe("light");
    localStorage.setItem(THEME_KEY, "sepia");
    expect(readTheme()).toBe("light");
  });

  it("sets data-theme and saves the choice, and light clears both", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(readTheme()).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("follows the computer's dark mode and contrast settings for System", () => {
    const os = system({ "(prefers-color-scheme: dark)": true });
    applyTheme("system");
    expect(readTheme()).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    const stop = watchSystemTheme();
    os.change({ "(prefers-contrast: more)": true });
    expect(document.documentElement.dataset.theme).toBe("high-contrast");
    os.change({
      "(prefers-contrast: more)": false,
      "(prefers-color-scheme: dark)": false,
    });
    expect(document.documentElement.dataset.theme).toBeUndefined();
    stop();
  });
});
