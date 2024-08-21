import {
  DendroJob,
  FindJobsRequest,
  isFindJobsResponse,
} from "app/dendro/dendro-types";
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../NwbFileContext";
import JobView from "./JobView";
import { useJobProducingOutput } from "./useJobProducingOutput";

type DendroViewProps = {
  width: number;
  height: number;
};

const DendroView: FunctionComponent<DendroViewProps> = ({ width, height }) => {
  const nwbFile = useNwbFile();
  const nwbFileUrl = nwbFile.getUrls()[0];
  const job = useJobProducingOutput(nwbFileUrl);

  if (!nwbFile) return <div>No NWB file</div>;
  if (!nwbFileUrl) return <div>No NWB URL</div>;
  if (job === undefined) {
    return <div>Loading...</div>;
  }
  if (job === null) {
    return <div>No Dendro provenance for this file.</div>;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "auto",
      }}
    >
      <h3>This file was produced by the following Dendro job</h3>
      <JobView job={job} refreshJob={undefined} />
    </div>
  );
};

export default DendroView;
