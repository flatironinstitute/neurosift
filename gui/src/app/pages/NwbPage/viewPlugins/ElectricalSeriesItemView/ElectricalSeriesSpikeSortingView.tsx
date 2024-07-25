import {
  PairioJob,
  PairioJobDefinition,
  PairioJobRequiredResources,
} from "app/pairio/types";
import { FunctionComponent, useMemo } from "react";
import { getJobOutputUrl, removeLeadingSlash } from "../CEBRA/PairioHelpers";
import { useNwbFile } from "../../NwbFileContext";
import { useElectricalSeriesSamplingRate } from "../Ephys/EphysSummaryItemView";
import PairioItemView from "../CEBRA/PairioItemView";
import { RemoteH5FileX } from "@remote-h5-file/index";
import { useRemoteH5FileLindi } from "../CEBRA/CEBRAView";
import RasterPlotView3 from "../Units/RasterPlotView3/RasterPlotView3";
import useRoute from "app/useRoute";

type ElectricalSeriesSpikeSortingViewProps = {
  width: number;
  height: number;
  path: string;
};

const serviceName = "hello_world_service";
const appName = "hello_mountainsort5";
const processorName = "mountainsort5_1";

const getJobDefinition = (
  adjustableParameterValues: { [key: string]: any },
  inputFileUrl: string,
  path: string,
): PairioJobDefinition => {
  return {
    appName,
    processorName,
    inputFiles: [
      {
        name: "input",
        fileBaseName: inputFileUrl.endsWith(".lindi.json")
          ? "input.lindi.json"
          : "input.nwb",
        url: inputFileUrl,
      },
    ],
    outputFiles: [
      {
        name: "output",
        fileBaseName: "units.nwb.lindi.json",
      },
    ],
    parameters: [
      {
        name: "electrical_series_path",
        value: removeLeadingSlash(path),
      },
      {
        name: "segment_start_time_sec",
        value: adjustableParameterValues.segment_start_time_sec,
      },
      {
        name: "segment_duration_sec",
        value: adjustableParameterValues.segment_duration_sec,
      },
    ],
  };
};

const getRequiredResources = (
  _requireGpu: boolean,
): PairioJobRequiredResources => {
  return {
    numCpus: 2,
    numGpus: 0,
    memoryGb: 4,
    timeSec: 60 * 50,
  };
};

const gpuMode: "optional" | "required" | "forbidden" = "forbidden" as any;

const title = "Spike Sorting (under construction - do not use!)";

const ElectricalSeriesSpikeSortingView: FunctionComponent<
  ElectricalSeriesSpikeSortingViewProps
> = ({ width, height, path }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return nwbFile.getUrls()[0];
  }, [nwbFile]);

  // const electricalSeriesPathChoices: string[] | undefined = useElectricalSeriesPathChoices(nwbFile);

  const samplingRate = useElectricalSeriesSamplingRate(nwbFile, path);

  const tags = useMemo(() => ["neurosift", "MountainSort5"], []);

  const { adjustableParameters, defaultAdjustableParameters } = useMemo(() => {
    // if (!electricalSeriesPathChoices) return ({ adjustableParameters: undefined, defaultAdjustableParameters: undefined });
    const adjustableParameters: {
      name: string;
      type: "number" | "string";
      choices: any[];
    }[] = [
      { name: "segment_start_time_sec", type: "number", choices: [0] },
      { name: "segment_duration_sec", type: "number", choices: [60] },
    ];

    const defaultAdjustableParameters = {
      segment_start_time_sec: 0,
      segment_duration_sec: 60,
    };
    return { adjustableParameters, defaultAdjustableParameters };
  }, []);

  const jobFilter = useMemo(
    () => (job: PairioJob) => {
      // make sure electrical_series_path matches
      const p = job.jobDefinition.parameters.find(
        (p) => p.name === "electrical_series_path",
      );
      if (!p) return false;
      if (p.value !== removeLeadingSlash(path)) return false;
      return true;
    },
    [path],
  );

  // if (!electricalSeriesPathChoices) {
  //   return <div>Loading electrical series path choices...</div>;
  // }
  if (!adjustableParameters) {
    return <div>Unexpected: adjustableParameters is undefined</div>;
  }
  if (!defaultAdjustableParameters) {
    return <div>Unexpected: defaultAdjustableParameters is undefined</div>;
  }

  if (samplingRate === undefined) {
    return <div>Loading electrical series info...</div>;
  }

  if (samplingRate === null) {
    return <div>Error loading electrical series info</div>;
  }

  if (samplingRate < 10000) {
    return (
      <div>
        <p>
          The sampling rate of the electrical series is too low to run the
          ephys_summary processor.
        </p>
        <p>Sampling rate: {samplingRate} Hz</p>
      </div>
    );
  }

  return (
    <PairioItemView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
      serviceName={serviceName}
      appName={undefined} // go by tags instead of app/processor
      processorName={processorName} // go by tags instead of app/processor
      tags={tags}
      title={title}
      adjustableParameters={adjustableParameters}
      defaultAdjustableParameters={defaultAdjustableParameters}
      getJobDefinition={getJobDefinition}
      getRequiredResources={getRequiredResources}
      gpuMode={gpuMode}
      OutputComponent={ElectricalSeriesSpikeSortingOutputComponent}
      compact={false}
      jobFilter={jobFilter}
    />
  );
};

type ElectricalSeriesSpikeSortingOutputComponentProps = {
  job: PairioJob;
  width: number;
  nwbFile: RemoteH5FileX;
};

const ElectricalSeriesSpikeSortingOutputComponent: FunctionComponent<
  ElectricalSeriesSpikeSortingOutputComponentProps
> = ({ job, width, nwbFile }) => {
  const { route } = useRoute();
  if (route.page !== "nwb") {
    throw Error("Unexpected: route.page is not nwb");
  }
  const unitsNwbOutputUrl = getJobOutputUrl(job, "output");

  const unitsNeurosiftUrl = useMemo(() => {
    if (!unitsNwbOutputUrl) return undefined;
    const q: { [key: string]: any } = {};
    q["p"] = "/nwb";
    q["url"] = unitsNwbOutputUrl;
    if (route.dandisetId) {
      q["dandisetId"] = route.dandisetId;
    }
    if (route.dandisetVersion) {
      q["dandisetVersion"] = route.dandisetVersion;
    }
    q["st"] = "lindi";
    let query = "";
    for (const key in q) {
      if (query) query += "&";
      query += key + "=" + q[key];
    }
    return window.location.origin + "/?" + query;
  }, [unitsNwbOutputUrl, route]);

  return (
    <div>
      Spike sorting output:{" "}
      <a href={unitsNeurosiftUrl} target="_blank" rel="noopener noreferrer">
        View in Neurosift
      </a>
    </div>
  );
};

export default ElectricalSeriesSpikeSortingView;
