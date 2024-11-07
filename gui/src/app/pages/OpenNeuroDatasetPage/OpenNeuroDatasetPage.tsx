import useRoute from "neurosift-lib/contexts/useRoute";
import { FunctionComponent, useEffect, useState } from "react";
import SessionsBrowser, { fetchSnapshotTagForDataset } from "./SessionsBrowser";

type OpenNeuroDatasetPageProps = {
  width: number;
  height: number;
};

const OpenNeuroDatasetPage: FunctionComponent<OpenNeuroDatasetPageProps> = ({
  width,
  height,
}) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "openneuro-dataset")
    throw new Error("Unexpected page in route");
  const { datasetId, datasetVersion } = route;
  const snapshotTag = useSnapshotTagForDataset(datasetId, datasetVersion);
  useEffect(() => {
    if (!datasetVersion && snapshotTag) {
      setRoute({
        page: "openneuro-dataset",
        datasetId,
        datasetVersion: snapshotTag,
      });
    }
  }, [datasetVersion, snapshotTag, setRoute, datasetId]);
  if (snapshotTag === undefined) {
    return <div>Retrieving snapshot for dataset {datasetId}</div>;
  }
  return (
    <SessionsBrowser
      datasetId={route.datasetId}
      snapshotTag={snapshotTag}
      onClickSession={() => {}}
    />
  );
};

const useSnapshotTagForDataset = (
  datasetId: string,
  datasetVersion: string | undefined,
): string | undefined => {
  const [snapshotTag, setSnapshotTag] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (datasetVersion) {
      setSnapshotTag(datasetVersion);
      return;
    }
    let canceled = false;
    (async () => {
      const snapshotTag = await fetchSnapshotTagForDataset(datasetId);
      if (canceled) return;
      setSnapshotTag(snapshotTag);
    })();
    return () => {
      canceled = true;
    };
  }, [datasetId, datasetVersion]);
  return snapshotTag;
};

export default OpenNeuroDatasetPage;
