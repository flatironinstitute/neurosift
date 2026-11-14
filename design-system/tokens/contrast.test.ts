import { beforeAll, describe, expect, it } from "vitest";
import { PLOT_THEMES, THEMES, TokenSet } from "./build.mjs";
import { contrastRatio } from "./contrast.mjs";

const set = TokenSet.load(new URL("./", import.meta.url));

// Each describe block sets the theme its pairings are measured in.
class Contrast {
  static theme: string | undefined;

  static ratio(foreground: string, background: string): number {
    return contrastRatio(set, foreground, background, Contrast.theme);
  }
}

const TEXT = 4.5;
const NON_TEXT = 3;
const READING = [
  "text.default",
  "text.secondary",
  "text.muted",
  "text.table-head",
  "text.link",
  "text.link-hover",
];
const STATUSES = ["error", "warning", "success", "info"];
const NAVY = [
  "surface.header",
  "surface.inverse",
  "surface.row-selected",
  "action.primary",
  "action.primary-hover",
  "action.primary-pressed",
];

const pairs: [string, string, number][] = [
  ...[
    "surface.page",
    "surface.panel",
    "surface.row-hover",
    "code.surface",
  ].flatMap((bg) =>
    READING.map((fg): [string, string, number] => [fg, bg, TEXT]),
  ),
  ...["text.default", "text.secondary", "text.table-head", "text.link"].map(
    (fg): [string, string, number] => [fg, "data.selection", TEXT],
  ),
  ...STATUSES.flatMap((s): [string, string, number][] => [
    [`status.${s}.text`, `status.${s}.bg`, TEXT],
    [`status.${s}.text`, "surface.panel", TEXT],
  ]),
  ...[...NAVY, "action.destructive", "action.destructive-hover"].map(
    (bg): [string, string, number] => ["text.on-inverse", bg, TEXT],
  ),
  ...[
    "code.text",
    "code.keyword",
    "code.string",
    "code.number",
    "code.comment",
  ].map((fg): [string, string, number] => [fg, "code.surface", TEXT]),
  ["text.default", "action.secondary-hover", TEXT],
  ["text.default", "action.secondary-pressed", TEXT],
  ...["surface.page", "surface.panel", "surface.row-hover"].map(
    (bg): [string, string, number] => ["border.focus", bg, NON_TEXT],
  ),
  ...["border.strong", "border.selected", "border.error"].map(
    (fg): [string, string, number] => [fg, "surface.panel", NON_TEXT],
  ),
];

// Charts theme on their own, so their pairs are checked in plot light and plot dark.
const plotPairs: [string, string, number][] = [
  ["plot.text", "plot.surface", TEXT],
  ["plot.text-muted", "plot.surface", TEXT],
  ["plot.mark", "plot.surface", NON_TEXT],
  ["plot.grid-major", "plot.surface", 1.5],
  ["data.cursor", "plot.surface", NON_TEXT],
  ...["1", "2", "3", "4", "5", "6", "other"].map(
    (n): [string, string, number] => [
      `data.series.${n}`,
      "plot.surface",
      NON_TEXT,
    ],
  ),
];

describe.each(["light", ...THEMES])(
  "contrast of the intended token pairings in %s (WCAG 2.2 AA)",
  (theme) => {
    beforeAll(() => {
      Contrast.theme = theme === "light" ? undefined : theme;
    });

    it.each(pairs)(
      "%s on %s reaches %s:1",
      (foreground, background, minimum) => {
        expect(Contrast.ratio(foreground, background)).toBeGreaterThanOrEqual(
          minimum,
        );
      },
    );

    it.each(NAVY)("border/focus-inverse on %s reaches 3:1", (background) => {
      expect(
        Contrast.ratio("border.focus-inverse", background),
      ).toBeGreaterThanOrEqual(NON_TEXT);
    });
  },
);

describe.each(["plot-light", ...Object.keys(PLOT_THEMES)])(
  "contrast of chart pairings in %s",
  (theme) => {
    beforeAll(() => {
      Contrast.theme = theme === "plot-light" ? undefined : theme;
    });

    it.each(plotPairs)(
      "%s on %s reaches %s:1",
      (foreground, background, minimum) => {
        expect(Contrast.ratio(foreground, background)).toBeGreaterThanOrEqual(
          minimum,
        );
      },
    );
  },
);

describe("light-theme pairings the Color page rules out", () => {
  beforeAll(() => {
    Contrast.theme = undefined;
  });

  it("flags text/muted on the selection tint, which the Color page rules out", () => {
    expect(Contrast.ratio("text.muted", "data.selection")).toBeLessThan(TEXT);
  });

  it("flags border/focus on navy, which is why the inverse ring exists", () => {
    expect(Contrast.ratio("border.focus", "surface.header")).toBeLessThan(
      NON_TEXT,
    );
  });
});
