import { describe, expect, it } from "vitest";
import { resolvePluginName } from "./pluginNameAliases";

describe("resolvePluginName", () => {
  it("resolves the name a renamed plugin had in already-shared links", () => {
    expect(resolvePluginName("TimeAlignedSeries")).toBe("EventRelatedSignal");
  });

  it("leaves a current name alone", () => {
    expect(resolvePluginName("EventRelatedSignal")).toBe("EventRelatedSignal");
    expect(resolvePluginName("PSTH")).toBe("PSTH");
  });
});
