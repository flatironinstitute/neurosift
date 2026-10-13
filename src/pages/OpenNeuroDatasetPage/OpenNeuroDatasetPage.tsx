import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ResponsiveLayout from "@components/ResponsiveLayout";
import { addRecentOpenNeuroDataset } from "../util/recentOpenNeuroDatasets";
import OpenNeuroDatasetOverview from "./OpenNeuroDatasetOverview";
import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import DatasetWorkspace from "../common/DatasetWorkspace/DatasetWorkspace";
import useRegisterOpenNeuroAIComponent from "./useRegisterOpenNeuroAIComponent";
import { OpenNeuroDatasetInfo } from "./types";
import { fetchDatasetInfo, fetchDirectoryFiles } from "./openNeuroApi";

type OpenNeuroDatasetPageProps = {
  width: number;
  height: number;
  datasetId?: string;
};

const OpenNeuroDatasetPage: FunctionComponent<OpenNeuroDatasetPageProps> = ({
  width,
  height,
  datasetId: datasetIdProp,
}) => {
  const { datasetId: datasetIdFromParams, version } = useParams();
  const datasetId = datasetIdProp || datasetIdFromParams;
  const [searchParams] = useSearchParams();
  const [datasetInfo, setDatasetInfo] = useState<OpenNeuroDatasetInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const info = await fetchDatasetInfo(datasetId, version);
        setDatasetInfo(info);
        setError(null);
        // Add to recent datasets
        addRecentOpenNeuroDataset(info.id);
      } catch (err) {
        console.error("Error fetching dataset:", err);
        setError(err instanceof Error ? err.message : "Failed to load dataset");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [datasetId, version]);

  const loadFileFromPath = useMemo(
    () =>
      async (
        filePath: string,
        parentId: string,
      ): Promise<DatasetFile | null> => {
        const snapshotTag = datasetInfo?.snapshot.tag;
        if (!datasetId || !snapshotTag) return null;
        try {
          const files = await fetchDirectoryFiles(datasetId, snapshotTag, {
            id: parentId,
            filepath: "",
          });
          const fileName = filePath.split("/").pop();
          const matchingFile = files.find((f) => f.filename === fileName);
          if (!matchingFile) return null;
          return { ...matchingFile, filepath: filePath };
        } catch (error) {
          console.error("Error loading file:", error);
          return null;
        }
      },
    [datasetId, datasetInfo?.snapshot.tag],
  );

  const fetchDirectory = useMemo(
    () =>
      async (parent: DatasetFile): Promise<DatasetFile[]> => {
        const snapshotTag = datasetInfo?.snapshot.tag;
        if (!datasetId || !snapshotTag) return [];
        return fetchDirectoryFiles(datasetId, snapshotTag, parent);
      },
    [datasetId, datasetInfo?.snapshot.tag],
  );

  // Register AI component
  useRegisterOpenNeuroAIComponent({
    datasetInfo,
    error,
    loading,
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!datasetInfo) return <div>No dataset found</div>;

  const initialSplitterPosition = Math.max(300, Math.min(450, width / 3));
  const tabFilePath = searchParams.get("tab");

  return (
    <ResponsiveLayout
      width={width}
      height={height}
      initialSplitterPosition={initialSplitterPosition}
      mobileBreakpoint={768}
    >
      <OpenNeuroDatasetOverview
        width={0}
        height={0}
        datasetInfo={datasetInfo}
      />
      <DatasetWorkspace
        width={0}
        height={0}
        topLevelFiles={datasetInfo.snapshot.files}
        initialTab={tabFilePath}
        loadFileFromPath={loadFileFromPath}
        fetchDirectory={fetchDirectory}
      />
    </ResponsiveLayout>
  );
};

export default OpenNeuroDatasetPage;
