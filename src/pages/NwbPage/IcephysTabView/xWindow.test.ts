import { describe, expect, it } from "vitest";
import { parseXWindow } from "./xWindow";

describe("parseXWindow", () => {
  it("crops to a window whose start is before its end", () => {
    expect(parseXWindow("10", "250")).toEqual({
      range: [10, 250],
      error: null,
    });
  });

  it("shows the whole sweep, without an error, until both ends are set", () => {
    expect(parseXWindow("", "")).toEqual({ range: null, error: null });
    expect(parseXWindow("10", " ")).toEqual({ range: null, error: null });
  });

  it("says so, in a sentence, when the start isn't before the end", () => {
    expect(parseXWindow("300", "100")).toEqual({
      range: null,
      error: "Window start must be before the end.",
    });
    expect(parseXWindow("5", "5").error).toBe(
      "Window start must be before the end.",
    );
  });

  it("says so when an end isn't a number", () => {
    expect(parseXWindow("abc", "100").error).toBe(
      "Window bounds must be numbers.",
    );
  });
});
