import { describe, expect, it } from "vitest";
import { readableOn } from "./plotColors";

describe("readableOn", () => {
  it("keeps a color that already reads on the chart", () => {
    expect(readableOn("#d55e00", "#ffffff")).toBe("#d55e00");
    expect(readableOn("#49f3c0", "#111921")).toBe("#49f3c0");
  });

  it("lightens a dark unit color on a dark chart, keeping its hue", () => {
    const lifted = readableOn("#13055b", "#111921");
    expect(lifted).not.toBe("#13055b");
    const [r, g, b] = [1, 3, 5].map((i) =>
      parseInt(lifted.slice(i, i + 2), 16),
    );
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it("darkens a pale color on a light chart", () => {
    const darker = readableOn("#c3f1a2", "#ffffff");
    expect(darker).not.toBe("#c3f1a2");
  });

  it("leaves colors it can't parse alone", () => {
    expect(readableOn("rgba(0,0,0,0.5)", "#ffffff")).toBe("rgba(0,0,0,0.5)");
  });
});
