import { describe, expect, it } from "vitest";
import { TokenSet } from "./build.mjs";

const set = TokenSet.load(new URL("./", import.meta.url));

interface Color {
  hex: string;
  alpha?: number;
}

class Contrast {
  static resolve(path: string): Color {
    let token = set.tokens.get(path);
    while (token && typeof token.$value === "string")
      token = set.tokens.get(token.$value.slice(1, -1));
    if (!token) throw new Error(`No token ${path}`);
    return token.$value as Color;
  }

  static channels(hex: string): number[] {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  // A translucent color is flattened onto what it sits on, as the browser draws it.
  static flatten(color: Color, under: string): string {
    const alpha = color.alpha ?? 1;
    const top = Contrast.channels(color.hex);
    const base = Contrast.channels(under);
    return `#${top
      .map((v, i) =>
        Math.round(v * alpha + base[i] * (1 - alpha))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }

  static luminance(hex: string): number {
    const [r, g, b] = Contrast.channels(hex)
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  static ratio(foreground: string, background: string): number {
    const page = Contrast.resolve("surface.page").hex;
    const bg = Contrast.flatten(Contrast.resolve(background), page);
    const fg = Contrast.flatten(Contrast.resolve(foreground), bg);
    const [light, dark] = [Contrast.luminance(fg), Contrast.luminance(bg)].sort(
      (a, b) => b - a,
    );
    return (light + 0.05) / (dark + 0.05);
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
  ...["1", "2", "3", "4", "5", "6", "other"].map(
    (n): [string, string, number] => [
      `data.series.${n}`,
      "surface.panel",
      NON_TEXT,
    ],
  ),
  ["data.cursor", "surface.panel", NON_TEXT],
];

describe("contrast of the intended token pairings (WCAG 2.2 AA)", () => {
  it.each(pairs)("%s on %s reaches %s:1", (foreground, background, minimum) => {
    expect(Contrast.ratio(foreground, background)).toBeGreaterThanOrEqual(
      minimum,
    );
  });

  it("flags text/muted on the selection tint, which the Color page rules out", () => {
    expect(Contrast.ratio("text.muted", "data.selection")).toBeLessThan(TEXT);
  });

  it.each(NAVY)("border/focus-inverse on %s reaches 3:1", (background) => {
    expect(
      Contrast.ratio("border.focus-inverse", background),
    ).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it("flags border/focus on navy, which is why the inverse ring exists", () => {
    expect(Contrast.ratio("border.focus", "surface.header")).toBeLessThan(
      NON_TEXT,
    );
  });
});
