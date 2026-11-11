import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IconSource, OUTPUT, SOURCE } from "./build.mjs";

// The Carbon equivalents of the MUI icons the app uses today (Figma Iconography, replacement map).
const MUI_REPLACEMENTS = [
  "search",
  "close",
  "share",
  "copy",
  "launch",
  "download",
  "recently-viewed",
  "settings",
  "reset",
  "chevron--left",
  "chevron--right",
  "play",
  "pause",
  "stop",
  "skip--back",
  "logo--github",
];

// Icons the components draw themselves: status icons, checkbox marks, chevrons, carets, the info button, the app bar, tree and sort icons, time controls, show and hide, and neurodata types.
const COMPONENT_ICONS = [
  "error",
  "checkmark",
  "subtract",
  "chevron--down",
  "information",
  "checkmark--outline",
  "warning--alt",
  "caret--right",
  "caret--down",
  "help",
  "link",
  "folder",
  "folder--open",
  "data--structured",
  "document",
  "arrow--up",
  "arrow--down",
  "zoom--in",
  "zoom--out",
  "add",
  "chevron--up",
  "view",
  "view--off",
  "chart--line",
  "chart--multi-line",
  "chart--point",
  "chart--histogram",
  "time-plot",
  "microscope",
  "layers",
  "image",
  "video",
  "data-table",
  "direction--curve",
  "heat-map",
  "chip",
  "tree-view",
];

const icons = IconSource.load(SOURCE);

describe("icons", () => {
  it("holds the MUI replacements and the icons components draw, nothing else", () => {
    expect(Object.keys(icons).sort()).toEqual(
      [...MUI_REPLACEMENTS, ...COMPONENT_ICONS].sort(),
    );
  });

  it("matches the committed icons.ts", () => {
    expect(readFileSync(OUTPUT, "utf8")).toBe(IconSource.module(icons));
  });

  it("keeps even-odd fills, which the GitHub mark needs", () => {
    expect(icons["logo--github"][0].evenOdd).toBe(true);
    expect(icons.search.every((path) => path.evenOdd === undefined)).toBe(true);
  });

  it("draws circles as path data", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="23.5" r="1.5"/></svg>';
    expect(IconSource.parse("dot", svg)).toEqual([
      { d: "M14.5,23.5a1.5,1.5,0,1,0,3,0a1.5,1.5,0,1,0,-3,0Z" },
    ]);
  });

  it("rejects markup it can't draw, instead of dropping it", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="4" y="4" width="8" height="8"/></svg>';
    expect(() => IconSource.parse("box", svg)).toThrow(
      "box: unsupported markup",
    );
  });

  it("rejects icons that aren't on the 32px grid", () => {
    expect(() =>
      IconSource.parse("small", '<svg viewBox="0 0 16 16"></svg>'),
    ).toThrow("small: expected a 32px Carbon icon");
  });
});
