import {
  RemoteH5FileLindi,
  RemoteH5FileX,
  getRemoteH5FileLindi,
} from "../../remote-h5-file/index";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import Markdown from "../../components/Markdown";
import {
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
} from "../../misc/dendro/dendro-types";
import { useNwbFile } from "../../misc/NwbFileContext";
import EmbeddingPlot3D from "./EmbeddingPlot3D";
import EmbeddingTimePlot from "./EmbeddingTimePlot";
import LossPlot from "./LossPlot";
import {
  getJobOutputUrl,
  getJobParameterValue,
  removeLeadingSlash,
} from "./DendroHelpers";
import DendroItemView from "./DendroItemView";
import getIntrinsicDimensionMarkdown from "./getIntrinsicDimensionMarkdown";
import getPowerSpectrumMarkdown from "./getPowerSpectrumMarkdown";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const maxIterationsChoices = [100, 1000, 10000];
const binSizeMsecChoices = [10, 20, 50, 100, 200, 500, 1000];
const outputDimensionsChoices = [1, 2, 3, 4, 5, 10, 20];

const adjustableParameters: { name: string; type: "number"; choices: any[] }[] =
  [
    { name: "max_iterations", type: "number", choices: maxIterationsChoices },
    { name: "bin_size_msec", type: "number", choices: binSizeMsecChoices },
    {
      name: "output_dimensions",
      type: "number",
      choices: outputDimensionsChoices,
    },
  ];

const defaultAdjustableParameters = {
  max_iterations: 1000,
  bin_size_msec: 20,
  output_dimensions: 10,
};

const serviceName = "hello_world_service";
const appName = "hello_cebra";
const processorName = "cebra_nwb_embedding_5";

const getJobDefinition = (
  adjustableParameterValues: { [key: string]: any },
  inputFileUrl: string,
  path: string,
): DendroJobDefinition => {
  return {
    appName,
    processorName,
    inputFiles: [
      {
        name: "input",
        fileBaseName: inputFileUrl.endsWith(".lindi.json")
          ? "input.lindi.json"
          : inputFileUrl.endsWith(".lindi.tar")
            ? "input.lindi.tar"
            : "input.nwb",
        url: inputFileUrl,
      },
    ],
    outputFiles: [
      {
        name: "output",
        fileBaseName: "cebra.lindi.tar",
      },
    ],
    parameters: [
      {
        name: "max_iterations",
        value: adjustableParameterValues.max_iterations,
      },
      {
        name: "bin_size_msec",
        value: adjustableParameterValues.bin_size_msec,
      },
      {
        name: "output_dimensions",
        value: adjustableParameterValues.output_dimensions,
      },
      {
        name: "batch_size",
        value: 1000,
      },
      {
        name: "units_path",
        value: removeLeadingSlash(path),
      },
    ],
  };
};

const getRequiredResources = (
  requireGpu: boolean,
): DendroJobRequiredResources => {
  return {
    numCpus: requireGpu ? 1 : 4,
    numGpus: requireGpu ? 1 : 0,
    memoryGb: 8,
    timeSec: 60 * 50,
  };
};

const gpuMode: "optional" | "required" | "forbidden" = "optional" as any;

const title = "CEBRA Embedding";

const CEBRAView: FunctionComponent<Props> = ({ width, height, path }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return (nwbFile.sourceUrls || [])[0];
  }, [nwbFile]);

  const tags = useMemo(() => ["neurosift", "CEBRA"], []);

  return (
    <DendroItemView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
      serviceName={serviceName}
      appName={undefined} // go by tags instead of app/processor
      processorName={undefined} // go by tags instead of app/processor
      tags={tags}
      title={title}
      adjustableParameters={adjustableParameters}
      defaultAdjustableParameters={defaultAdjustableParameters}
      getJobDefinition={getJobDefinition}
      getRequiredResources={getRequiredResources}
      gpuMode={gpuMode}
      OutputComponent={CEBRAJobOutputWidget}
    />
  );
};

const CEBRAJobOutputWidget: FunctionComponent<{
  job: DendroJob;
  width: number;
  nwbFile: RemoteH5FileX;
}> = ({ job }) => {
  const cebraOutputUrl = getJobOutputUrl(job, "output");
  const outputFile = useRemoteH5FileLindi(cebraOutputUrl);
  const loss = useLoss(outputFile);
  const embedding = useEmebdding(outputFile);

  const binSizeMsec = getJobParameterValue(job, "bin_size_msec") as number;

  return (
    <div>
      {job && cebraOutputUrl && (
        <div>
          {embedding ? (
            <EmbeddingPlot3D embedding={embedding} width={800} height={400} />
          ) : (
            <div style={{ position: "relative", width: 800, height: 400 }}>
              Loading embedding data...
            </div>
          )}
          {embedding ? (
            <EmbeddingTimePlot
              embedding={embedding}
              binSizeMsec={binSizeMsec}
              width={1400}
              height={300}
            />
          ) : (
            <div style={{ position: "relative", width: 800, height: 400 }}>
              Loading embedding data...
            </div>
          )}
          {loss ? (
            <LossPlot loss={loss} width={800} height={400} />
          ) : (
            <div style={{ position: "relative", width: 800, height: 400 }}>
              Loading loss data...
            </div>
          )}
          <div>&nbsp;</div>
          <hr />
          <Markdown source={getIntrinsicDimensionMarkdown(cebraOutputUrl)} />
          <div>&nbsp;</div>
          <hr />
          <Markdown
            source={getPowerSpectrumMarkdown(cebraOutputUrl, binSizeMsec)}
          />
          <hr />
          <div>Embedding URL: {cebraOutputUrl}</div>
        </div>
      )}
    </div>
  );
};

export const useRemoteH5FileLindi = (url: string | undefined) => {
  const [file, setFile] = useState<RemoteH5FileLindi | null>(null);
  useEffect(() => {
    if (!url) {
      setFile(null);
      return;
    }
    let canceled = false;
    (async () => {
      setFile(null);
      const f = await getRemoteH5FileLindi(url);
      if (canceled) return;
      setFile(f);
    })();
    return () => {
      canceled = true;
    };
  }, [url]);

  return file;
};

const useLoss = (h5: RemoteH5FileX | null) => {
  const [loss, setLoss] = useState<any | null>(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!h5) return;
      const l = await h5.getDatasetData("loss", {});
      if (canceled) return;
      setLoss(l);
    })();
    return () => {
      canceled = true;
    };
  }, [h5]);

  return loss;
};

const useEmebdding = (h5: RemoteH5FileX | null) => {
  const [embedding, setEmbedding] = useState<number[][] | null>(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!h5) return;
      const ds = await h5.getDataset("embedding");
      if (!ds) return;
      if (canceled) return;
      const shape = ds.shape;
      const e = await h5.getDatasetData("embedding", {});
      const eReshaped = reshape2D(e, [shape[0], shape[1]]);
      if (canceled) return;
      setEmbedding(eReshaped);
    })();
    return () => {
      canceled = true;
    };
  }, [h5]);

  return embedding;
};

const reshape2D = (data: any, shape: [number, number]) => {
  const rows = shape[0];
  const cols = shape[1];
  const ret = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(data[i * cols + j]);
    }
    ret.push(row);
  }
  return ret;
};

export default CEBRAView;
