import { describe, expect, it } from "vitest";
import type { NwbFileSpecifications } from "./SetupNwbFileSpecificationsProvider";
import {
  firstSentence,
  inheritance,
  matchesType,
  ownParts,
  schemaTypes,
} from "./schemaTypes";

const SPECS = {
  allNamespaces: [],
  allDatasets: [],
  allGroups: [],
  subgroups: [
    {
      name: "core",
      versions: [
        {
          version: "2.6.0-alpha",
          items: [
            {
              name: "nwb.base",
              value: {
                groups: [
                  {
                    neurodata_type_def: "NWBContainer",
                    neurodata_type_inc: "Container",
                    doc: "A container",
                  },
                  {
                    neurodata_type_def: "TimeSeries",
                    neurodata_type_inc: "NWBContainer",
                    doc: "General",
                    datasets: [{ name: "data", doc: "Values" }],
                    attributes: [{ name: "comments" }],
                  },
                  {
                    neurodata_type_def: "ElectricalSeries",
                    neurodata_type_inc: "TimeSeries",
                    doc: "Voltage",
                    datasets: [
                      {
                        neurodata_type_inc: "DynamicTableRegion",
                        name: "electrodes",
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: "hdmf-common",
      versions: [
        {
          version: "1.5.0",
          items: [
            {
              name: "table",
              value: {
                datasets: [
                  {
                    data_type_def: "VectorData",
                    data_type_inc: "Data",
                    doc: "A column",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
} as unknown as NwbFileSpecifications;

describe("schemaTypes", () => {
  const types = schemaTypes(SPECS);

  it("lists each type with its kind and namespace, naming hdmf-common types from data_type_def", () => {
    expect(types.map((t) => [t.name, t.kind, t.namespace, t.extends])).toEqual([
      ["NWBContainer", "Group", "core", "Container"],
      ["TimeSeries", "Group", "core", "NWBContainer"],
      ["ElectricalSeries", "Group", "core", "TimeSeries"],
      ["VectorData", "Dataset", "hdmf-common", "Data"],
    ]);
  });

  it("follows inheritance to the most general type", () => {
    expect(inheritance(types, "ElectricalSeries")).toEqual([
      "Container",
      "NWBContainer",
      "TimeSeries",
    ]);
    expect(inheritance(types, "Unknown")).toEqual([]);
  });

  it("names a type's own parts", () => {
    const own = ownParts(types[1].spec);
    expect(own.datasets).toEqual([{ name: "data", doc: "Values" }]);
    expect(own.attributes.map((a) => a.name)).toEqual(["comments"]);
    expect(ownParts(types[2].spec).datasets[0].name).toBe("electrodes");
  });

  it("finds types by name", () => {
    expect(
      types.filter((t) => matchesType(t, "series")).map((t) => t.name),
    ).toEqual(["TimeSeries", "ElectricalSeries"]);
  });

  it("cuts a description to its first sentence for the table", () => {
    expect(firstSentence("Voltage data. The first dimension is time.")).toBe(
      "Voltage data.",
    );
    expect(firstSentence("Version 2.6.0 data. More.")).toBe(
      "Version 2.6.0 data.",
    );
    expect(firstSentence("No full stop")).toBe("No full stop");
  });
});
