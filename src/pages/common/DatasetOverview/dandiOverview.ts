import { formatBytes } from "@shared/util/formatBytes";
import { DandisetVersionInfo } from "../../DandiPage/dandi-types";
import type { DatasetFact, DatasetSection } from "./DatasetOverview";

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const when = <T>(condition: unknown, value: T): T[] =>
  condition ? [value] : [];

/** The facts and sections DANDI and EMBER share, read from a Dandiset version. */
export function dandisetContent(info: DandisetVersionInfo): {
  facts: DatasetFact[];
  sections: DatasetSection[];
} {
  const { metadata } = info;
  const summary = metadata.assetsSummary;
  const methods = [
    ...(summary.approach ?? []).map((a) => a.name),
    ...(summary.measurementTechnique ?? []).map((t) => t.name),
  ];
  const contributors = (metadata.contributor ?? [])
    .map((c) => c.name)
    .join(", ");
  const species = (summary.species ?? []).map((s) => s.name).join(", ");
  const licenses = (metadata.license ?? []).join(", ");

  return {
    facts: [
      { term: "Created", value: shortDate(info.created) },
      { term: "Modified", value: shortDate(info.modified) },
      { term: "Status", value: info.status },
      { term: "Size", value: formatBytes(info.size) },
      { term: "Files", value: info.asset_count.toLocaleString("en-US") },
      ...when(summary.numberOfSubjects != null, {
        term: "Subjects",
        value: String(summary.numberOfSubjects),
      }),
    ],
    sections: [
      ...when(metadata.description, {
        id: "description",
        title: "Description",
        text: metadata.description,
      }),
      ...when(contributors, {
        id: "contributors",
        title: "Contributors",
        text: contributors,
        textName: "contributor list",
      }),
      ...when(licenses || metadata.citation, {
        id: "license",
        title: "License and citation",
        facts: [
          ...when(licenses, { term: "License", value: licenses }),
          ...when(metadata.citation, {
            term: "Citation",
            value: metadata.citation,
          }),
        ],
      }),
      ...when(metadata.keywords?.length, {
        id: "keywords",
        title: "Keywords",
        tags: metadata.keywords,
      }),
      ...when(species || methods.length, {
        id: "methods",
        title: "Species and methods",
        facts: [
          ...when(species, { term: "Species", value: species }),
          ...when(methods.length, {
            term: "Methods",
            value: methods.join(", "),
          }),
        ],
      }),
    ],
  };
}
