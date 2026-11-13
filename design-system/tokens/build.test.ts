import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OUTPUT, SPECIMENS, TokenSet } from "./build.mjs";

const set = TokenSet.load(new URL("./", import.meta.url));

describe("design tokens", () => {
  it("reads every token from the five files", () => {
    expect(set.tokens.size).toBe(72 + 53 + 41 + 17 + 3);
  });

  it("gives every token one CSS name", () => {
    const names = set.declarations().map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("matches the committed tokens.css and docs specimens", () => {
    expect(readFileSync(OUTPUT, "utf8")).toBe(set.css());
    expect(readFileSync(SPECIMENS, "utf8")).toBe(set.specimenCss());
  });

  it("writes a class per text style", () => {
    expect(set.css()).toContain(
      ".type-code-sm {\n  font: var(--type-code-sm);\n  letter-spacing: var(--type-code-sm-letter-spacing);\n}",
    );
  });

  it("exposes each color, size and shadow to the docs as --token", () => {
    const css = set.specimenCss();
    expect(css).toContain(".token-space-4 {\n  --token: var(--space-4);\n}");
    expect(css).toContain(
      ".token-elevation-1 {\n  --token: var(--elevation-1);\n}",
    );
    expect(css).not.toContain(".token-type-body");
  });

  it("writes aliases as var() references", () => {
    const css = set.css();
    expect(css).toContain("--surface-header: var(--color-navy-600);");
    expect(css).toContain("--color-navy-600-a08: #2c3e5014;");
  });

  it("writes text styles in rem with tracking in em, so they follow the reader's font size", () => {
    const css = set.css();
    expect(css).toContain(
      "--type-label: 600 0.875rem/1.3 var(--font-family-sans);",
    );
    expect(css).toContain("--type-display-letter-spacing: -0.02em;");
    expect(css).toContain("--type-body-letter-spacing: 0;");
  });

  it("writes sizes in rem but keeps border widths and shadows in px", () => {
    const css = set.css();
    expect(css).toContain("--space-4: 1rem;");
    expect(css).toContain("--space-0-5: 0.125rem;");
    expect(css).toContain("--border-width-1: 1px;");
    expect(css).toMatch(/--elevation-1: 0 1px 2px 0 #2c3e501a/);
  });

  it("rejects an unknown reference", () => {
    const broken = { a: { $type: "color", $value: "{missing.token}" } };
    expect(() => new TokenSet([broken]).css()).toThrow(
      "Unknown reference {missing.token}",
    );
  });

  it("rejects a token defined twice", () => {
    const token = { $type: "dimension", $value: { value: 1, unit: "px" } };
    expect(() => new TokenSet([{ a: token }, { a: token }])).toThrow(
      "Duplicate token a",
    );
  });
});
