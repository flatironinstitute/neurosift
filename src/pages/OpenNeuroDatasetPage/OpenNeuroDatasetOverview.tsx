import { FunctionComponent } from "react";
import { formatBytes } from "@shared/util/formatBytes";
import DatasetOverview, {
  type DatasetSection,
} from "../common/DatasetOverview/DatasetOverview";
import { shortDate } from "../common/DatasetOverview/dandiOverview";
import { OpenNeuroDatasetInfo } from "./types";
import useRegisterOpenNeuroDatasetOverviewAIComponent from "./useRegisterOpenNeuroDatasetOverviewAIComponent";

interface OpenNeuroDatasetOverviewProps {
  width: number;
  height: number;
  datasetInfo: OpenNeuroDatasetInfo;
}

const count = (n: number) => n.toLocaleString("en-US");

/** An OpenNeuro dataset in the shared dataset overview. */
const OpenNeuroDatasetOverview: FunctionComponent<
  OpenNeuroDatasetOverviewProps
> = ({ datasetInfo }) => {
  const { snapshot } = datasetInfo;
  const { description, summary, analytics } = snapshot;
  useRegisterOpenNeuroDatasetOverviewAIComponent({ datasetInfo });

  const text = (id: string, title: string, value?: string): DatasetSection[] =>
    value ? [{ id, title, text: value }] : [];

  return (
    <DatasetOverview
      archive={{
        name: "OpenNeuro",
        href: `${import.meta.env.BASE_URL}openneuro`,
      }}
      itemName="Dataset"
      id={datasetInfo.id}
      title={description.Name}
      version={snapshot.tag}
      external={{
        label: "View on OpenNeuro",
        href: `https://openneuro.org/datasets/${datasetInfo.id}/versions/${snapshot.tag}`,
      }}
      facts={[
        { term: "Created", value: shortDate(snapshot.created) },
        { term: "Size", value: formatBytes(snapshot.size) },
        { term: "Views", value: count(analytics.views) },
        { term: "Downloads", value: count(analytics.downloads) },
        ...(summary
          ? [
              { term: "Files", value: count(summary.totalFiles) },
              { term: "Subjects", value: count(summary.subjects.length) },
              { term: "Sessions", value: count(summary.sessions.length) },
            ]
          : []),
      ]}
      sections={[
        ...(summary?.modalities.length
          ? [
              {
                id: "modalities",
                title: "Modalities",
                tags: summary.modalities,
              },
            ]
          : []),
        ...text("authors", "Authors", description.Authors.join(", ")),
        ...(description.DatasetDOI || description.License
          ? [
              {
                id: "license",
                title: "License and DOI",
                facts: [
                  ...(description.License
                    ? [{ term: "License", value: description.License }]
                    : []),
                  ...(description.DatasetDOI
                    ? [
                        {
                          term: "DOI",
                          value: description.DatasetDOI,
                          code: true,
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),
        ...text(
          "acknowledgements",
          "Acknowledgements",
          description.Acknowledgements,
        ),
        ...text("funding", "Funding", description.Funding),
        ...text(
          "references",
          "References and links",
          description.ReferencesAndLinks?.join("\n"),
        ),
      ]}
    />
  );
};

export default OpenNeuroDatasetOverview;
