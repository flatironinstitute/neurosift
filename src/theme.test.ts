// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, readTheme, THEME_KEY } from "./theme";

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
});
