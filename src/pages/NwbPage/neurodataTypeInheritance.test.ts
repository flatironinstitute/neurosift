import { describe, expect, it } from "vitest";
import {
  getNeurodataTypeAncestry,
  getNeurodataTypeParentMap,
  neurodataTypeInheritsFrom,
  neurodataTypeInheritsFromAny,
} from "./neurodataTypeInheritance";
import { NwbFileSpecifications } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";

const makeSpecifications = (o: {
  groups?: { def: string; inc?: string }[];
  datasets?: { def: string; inc?: string }[];
}): NwbFileSpecifications => ({
  subgroups: [],
  allNamespaces: [],
  allGroups: (o.groups || []).map((g) => ({
    doc: "",
    default_name: "",
    neurodata_type_def: g.def,
    neurodata_type_inc: g.inc,
  })),
  allDatasets: (o.datasets || []).map((d) => ({
    doc: "",
    neurodata_type_def: d.def,
    neurodata_type_inc: d.inc,
  })),
});

describe("neurodataTypeInheritsFrom", () => {
  it("matches a type against itself", () => {
    expect(neurodataTypeInheritsFrom("TimeSeries", "TimeSeries")).toBe(true);
  });

  it("does not match unrelated types", () => {
    expect(neurodataTypeInheritsFrom("TimeSeries", "DynamicTable")).toBe(false);
  });

  it("returns false for undefined type", () => {
    expect(neurodataTypeInheritsFrom(undefined, "TimeSeries")).toBe(false);
  });

  it("matches one level of inheritance from specifications (groups)", () => {
    const specs = makeSpecifications({
      groups: [{ def: "MySeries", inc: "TimeSeries" }],
    });
    expect(neurodataTypeInheritsFrom("MySeries", "TimeSeries", specs)).toBe(
      true,
    );
  });

  it("matches one level of inheritance from specifications (datasets)", () => {
    const specs = makeSpecifications({
      datasets: [{ def: "MyImage", inc: "RGBImage" }],
    });
    expect(neurodataTypeInheritsFrom("MyImage", "RGBImage", specs)).toBe(true);
  });

  it("matches transitively through multiple levels", () => {
    const specs = makeSpecifications({
      groups: [
        { def: "MySpecialSeries", inc: "MySeries" },
        { def: "MySeries", inc: "TimeSeries" },
      ],
    });
    expect(
      neurodataTypeInheritsFrom("MySpecialSeries", "TimeSeries", specs),
    ).toBe(true);
  });

  it("matches transitively through spec chain into the core fallback chain", () => {
    // Extension subtypes RGBImage; RGBImage -> Image comes from the fallback map
    const specs = makeSpecifications({
      datasets: [{ def: "MyRGBImage", inc: "RGBImage" }],
    });
    expect(neurodataTypeInheritsFrom("MyRGBImage", "Image", specs)).toBe(true);
  });

  it("uses core fallback relationships when specifications are unavailable", () => {
    expect(neurodataTypeInheritsFrom("GrayscaleImage", "Image")).toBe(true);
    expect(neurodataTypeInheritsFrom("TwoPhotonSeries", "ImageSeries")).toBe(
      true,
    );
    expect(neurodataTypeInheritsFrom("TwoPhotonSeries", "TimeSeries")).toBe(
      true,
    );
    expect(neurodataTypeInheritsFrom("Units", "DynamicTable")).toBe(true);
  });

  it("lets file specifications take precedence over the fallback map", () => {
    // Pathological case: file spec says GrayscaleImage extends RGBImage
    const specs = makeSpecifications({
      datasets: [{ def: "GrayscaleImage", inc: "RGBImage" }],
    });
    expect(neurodataTypeInheritsFrom("GrayscaleImage", "RGBImage", specs)).toBe(
      true,
    );
  });

  it("does not loop on cyclic specifications", () => {
    const specs = makeSpecifications({
      groups: [
        { def: "A", inc: "B" },
        { def: "B", inc: "A" },
      ],
    });
    expect(neurodataTypeInheritsFrom("A", "C", specs)).toBe(false);
    expect(neurodataTypeInheritsFrom("A", "B", specs)).toBe(true);
  });
});

describe("getNeurodataTypeAncestry", () => {
  it("returns the chain ordered from the type itself upward", () => {
    const specs = makeSpecifications({
      groups: [{ def: "MyTwoPhotonSeries", inc: "TwoPhotonSeries" }],
    });
    expect(getNeurodataTypeAncestry("MyTwoPhotonSeries", specs)).toEqual([
      "MyTwoPhotonSeries",
      "TwoPhotonSeries",
      "ImageSeries",
      "TimeSeries",
    ]);
  });

  it("supports lowest-parent resolution against a supported set", () => {
    const specs = makeSpecifications({
      datasets: [{ def: "MyRGBImage", inc: "RGBImage" }],
    });
    const supported = ["GrayscaleImage", "RGBImage", "RGBAImage", "Image"];
    const resolved = getNeurodataTypeAncestry("MyRGBImage", specs).find((t) =>
      supported.includes(t),
    );
    // The nearest supported ancestor wins, not the more general Image
    expect(resolved).toBe("RGBImage");
  });

  it("returns an empty chain for undefined", () => {
    expect(getNeurodataTypeAncestry(undefined)).toEqual([]);
  });
});

describe("neurodataTypeInheritsFromAny", () => {
  it("matches when any base matches", () => {
    expect(
      neurodataTypeInheritsFromAny("TwoPhotonSeries", [
        "DynamicTable",
        "ImageSeries",
      ]),
    ).toBe(true);
  });

  it("does not match when no base matches", () => {
    expect(
      neurodataTypeInheritsFromAny("TwoPhotonSeries", [
        "DynamicTable",
        "Units",
      ]),
    ).toBe(false);
  });
});

describe("getNeurodataTypeParentMap", () => {
  it("caches per specifications object", () => {
    const specs = makeSpecifications({
      groups: [{ def: "X", inc: "Y" }],
    });
    const m1 = getNeurodataTypeParentMap(specs);
    const m2 = getNeurodataTypeParentMap(specs);
    expect(m1).toBe(m2);
    expect(m1["X"]).toBe("Y");
  });

  it("returns the fallback map without specifications", () => {
    const m = getNeurodataTypeParentMap(undefined);
    expect(m["GrayscaleImage"]).toBe("Image");
  });
});
