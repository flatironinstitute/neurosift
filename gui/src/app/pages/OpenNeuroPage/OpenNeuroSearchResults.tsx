/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hyperlink } from "@fi-sci/misc";
import { FunctionComponent } from "react";
import { OpenNeuroDataset } from "./OpenNeuroBrowser";
import useRoute from "neurosift-lib/contexts/useRoute";
import formatByteCount from "../DandiPage/DandiBrowser/formatByteCount";

export const applicationBarColorDarkened = "#546"; // from dendro

type OpenNeuroSearchResultsProps = {
  width: number;
  height: number;
  searchResults?: OpenNeuroDataset[];
};

const OpenNeuroSearchResults: FunctionComponent<
  OpenNeuroSearchResultsProps
> = ({ width, height, searchResults }) => {
  if (!searchResults) {
    return <div style={{ padding: 20 }}>Querying OpenNeuro...</div>;
  }
  if (searchResults.length === 0) {
    return <div style={{ padding: 20 }}>No results found.</div>;
  }
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      {searchResults.map((result, i) => (
        <OpenNeuroSearchResultItem
          key={i}
          dataset={result}
          width={width}
          onOpenItem={(datasetId) => {
            const url = `https://openneuro.org/datasets/${datasetId}`;
            window.open(url, "_blank");
          }}
        />
      ))}
    </div>
  );
};

type OpenNeuroSearchResultItemProps = {
  dataset: OpenNeuroDataset;
  width: number;
  onOpenItem: (datasetId: string) => void;
};

const OpenNeuroSearchResultItem: FunctionComponent<
  OpenNeuroSearchResultItemProps
> = ({ dataset, width, onOpenItem }) => {
  return (
    <div style={{ padding: 10, borderBottom: "solid 1px #ccc" }}>
      <div style={{ fontSize: 18, fontWeight: "bold" }}>
        <Hyperlink
          color={applicationBarColorDarkened}
          onClick={() => {
            onOpenItem(dataset.id);
          }}
        >
          {dataset.id}: {`${dataset.latestSnapshot.description.Name}`}
        </Hyperlink>
      </div>
      <div style={{ fontSize: 14, color: "#666" }}>
        Uploaded by: {dataset.uploader.name}
      </div>
      <div style={{ fontSize: 14, color: "#666" }}>
        Created {dataset.created}
      </div>
      <div style={{ fontSize: 14, color: "#666" }}>
        {dataset.latestSnapshot.summary.subjects.length} subjects,{" "}
        {formatByteCount(dataset.latestSnapshot.size)}
      </div>
    </div>
  );
};

export const formatTime = (time: string) => {
  const timestamp = Date.parse(time);
  return new Date(timestamp).toLocaleString();
};

export default OpenNeuroSearchResults;
