import TimeScrollView2, {
  useTimeScrollView2,
} from "../../../timeseries/component-time-scroll-view-2/TimeScrollView2";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "../../../contexts/context-timeseries-selection";
import { useSelectedUnitIds } from "../../../contexts/context-unit-selection";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MatrixData, Opts } from "./WorkerTypes";
import { RemoteH5FileLindi } from "../../../remote-h5-file/index";

type SpikeDensityPlotWidgetProps = {
  width: number;
  height: number;
  multiscaleSpikeDensityOutputUrl: string;
  rastermapOutput?: {
    isort: number[];
  };
};

const gridlineOpts = {
  hideX: false,
  hideY: true,
};

const yAxisInfo = {
  showTicks: false,
  yMin: undefined,
  yMax: undefined,
};

class SpikeDensityMatrixClient {
  constructor(
    private d: {
      file: RemoteH5FileLindi;
      dsFactors: number[];
      startTimeSec: number;
      binSizeSec: number;
      numBins: number;
    },
  ) {}
  static async create(
    file: RemoteH5FileLindi,
  ): Promise<SpikeDensityMatrixClient> {
    const rootGroup = await file.getGroup("/");
    if (!rootGroup) {
      throw new Error("Unable to get root group");
    }
    const dsFactors = [];
    for (const ds0 of rootGroup.datasets) {
      if (ds0.name === "spike_counts") {
        dsFactors.push(1);
      } else if (ds0.name.startsWith("spike_counts_ds_")) {
        const m = ds0.name.match(/^spike_counts_ds_(\d+)$/);
        if (m) {
          dsFactors.push(parseInt(m[1]));
        }
      }
    }
    dsFactors.sort((a, b) => a - b);
    if (dsFactors.length === 0) {
      throw new Error("No spike_counts datasets found");
    }
    if (!dsFactors.includes(1)) {
      throw new Error("No spike_counts dataset found");
    }
    const ds1 = await file.getDataset("/spike_counts");
    if (!ds1) {
      throw new Error("Unable to get spike_counts dataset");
    }
    const startTimeSec = ds1.attrs["start_time_sec"];
    const binSizeSec = ds1.attrs["bin_size_sec"];
    const numBins = ds1.shape[0];
    return new SpikeDensityMatrixClient({
      file,
      dsFactors,
      startTimeSec,
      binSizeSec,
      numBins,
    });
  }
  get startTimeSec() {
    return this.d.startTimeSec;
  }
  get endTimeSec() {
    return this.d.startTimeSec + this.d.binSizeSec * this.d.numBins;
  }
  //   get unitIds(): (string | number)[] {
  //     throw Error("Not implemented");
  //   }
  async getData(
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
    numPixels: number,
  ): Promise<{
    startTimeSec: number;
    binSizeSec: number;
    numBins: number;
    numUnits: number;
    spikeCounts: number[];
  }> {
    let i1 = Math.floor(
      (visibleStartTimeSec - this.d.startTimeSec) / this.d.binSizeSec,
    );
    if (i1 < 0) i1 = 0;
    let i2 = Math.ceil(
      (visibleEndTimeSec - this.d.startTimeSec) / this.d.binSizeSec,
    );
    if (i2 > this.d.numBins) i2 = this.d.numBins;
    let iDsFactor = 0;
    while (
      iDsFactor + 1 < this.d.dsFactors.length &&
      (i2 - i1) / this.d.dsFactors[iDsFactor + 1] > numPixels / 2
    ) {
      iDsFactor++;
    }
    const dsFactor = this.d.dsFactors[iDsFactor];
    const j1 = Math.floor(i1 / dsFactor);
    const j2 = Math.floor(i2 / dsFactor);
    const dsName =
      dsFactor > 1 ? `/spike_counts_ds_${dsFactor}` : "/spike_counts";
    const ds = await this.d.file.getDataset(dsName);
    if (!ds) {
      throw new Error("Unable to get spike counts");
    }
    const data = await this.d.file.getDatasetData(dsName, {
      slice: [[j1, j2]],
    });
    if (!data) {
      throw new Error("Unable to get spike counts");
    }
    const spikeCounts = transpose(Array.from(data), j2 - j1, ds.shape[1]);
    return {
      startTimeSec: j1 * dsFactor * this.d.binSizeSec,
      binSizeSec: dsFactor * this.d.binSizeSec,
      numBins: j2 - j1,
      numUnits: ds.shape[1],
      spikeCounts: spikeCounts,
    };
  }
}

const transpose = (data: number[], numRows: number, numCols: number) => {
  const result: number[] = [];
  for (let j = 0; j < numCols; j++) {
    const aa: number[] = [];
    for (let i = 0; i < numRows; i++) {
      aa.push(data[i * numCols + j]);
    }
    result.push(...aa);
  }
  return result;
};

const SpikeDensityPlotWidget: FunctionComponent<
  SpikeDensityPlotWidgetProps
> = ({ width, height, multiscaleSpikeDensityOutputUrl, rastermapOutput }) => {
  const client = useSpikeDensityMatrixClient(multiscaleSpikeDensityOutputUrl);
  if (!client) return <div>Loading spike density matrix...</div>;
  return (
    <SpikeDensityPlotWidgetChild
      width={width}
      height={height}
      client={client}
      isort={rastermapOutput?.isort}
    />
  );
};

type SpikeDensityPlotWidgetChildProps = {
  width: number;
  height: number;
  client: SpikeDensityMatrixClient;
  isort?: number[];
};

const SpikeDensityPlotWidgetChild: FunctionComponent<
  SpikeDensityPlotWidgetChildProps
> = ({ width, height, client, isort }) => {
  const startTimeSec = client.startTimeSec;
  const endTimeSec = client.endTimeSec;
  const hideToolbar = false;
  useTimeseriesSelectionInitialization(startTimeSec, endTimeSec);
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  const { blockT1, blockT2 } = useMemo(() => {
    // do it like this so we are not constantly changing the data we are sending to the worker
    if (visibleStartTimeSec === undefined)
      return { blockT1: undefined, blockT2: undefined };
    if (visibleEndTimeSec === undefined)
      return { blockT1: undefined, blockT2: undefined };
    const span = visibleEndTimeSec - visibleStartTimeSec;
    // find a power of 2 that is greater than or equal to span
    const p = Math.ceil(Math.log2(span));
    return {
      blockT1: Math.floor(visibleStartTimeSec / 2 ** p) * 2 ** p,
      blockT2: Math.ceil(visibleEndTimeSec / 2 ** p) * 2 ** p,
    };
  }, [visibleStartTimeSec, visibleEndTimeSec]);

  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const [worker, setWorker] = useState<Worker | null>(null);

  const [hoveredUnitId, setHoveredUnitId] = useState<
    string | number | undefined
  >(undefined);

  const { selectedUnitIds } = useSelectedUnitIds();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {}, []);

  useEffect(() => {
    if (!canvasElement) return;
    const worker = new Worker(new URL("./worker", import.meta.url));
    const offscreenCanvas = canvasElement.transferControlToOffscreen();
    worker.postMessage(
      {
        canvas: offscreenCanvas,
      },
      [offscreenCanvas],
    );

    setWorker(worker);

    return () => {
      worker.terminate();
    };
  }, [canvasElement]);

  const [_, setLoadingMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    let canceled = false;
    if (!worker) return;
    if (blockT1 === undefined) return;
    if (blockT2 === undefined) return;

    (async () => {
      setLoadingMessage("Loading spike counts...");
      const { startTimeSec, binSizeSec, numBins, numUnits, spikeCounts } =
        await client.getData(blockT1, blockT2, width);
      if (canceled) return;
      setLoadingMessage("");
      const matrixData: MatrixData = {
        startTimeSec,
        binSizeSec,
        numBins,
        numUnits,
        spikeCounts,
      };
      worker.postMessage({
        matrixData,
      });
    })();

    return () => {
      canceled = true;
    };
  }, [worker, client, blockT1, blockT2, width, isort]);

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height,
  });

  useEffect(() => {
    if (!worker) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    const opts: Opts = {
      canvasWidth,
      canvasHeight,
      margins,
      visibleStartTimeSec,
      visibleEndTimeSec,
      hoveredUnitId,
      selectedUnitIds: [...selectedUnitIds],
      isort,
    };
    worker.postMessage({
      opts,
    });
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
    worker,
    hoveredUnitId,
    selectedUnitIds,
    isort,
  ]);

  // const unitIds = useMemo(() => client.unitIds, [client.unitIds]);

  //   const pixelToUnitId = useCallback(
  //     (p: { x: number; y: number }) => {
  //       const numUnits = unitIds.length;
  //       const frac =
  //         1 - (p.y - margins.top) / (canvasHeight - margins.top - margins.bottom);
  //       const index = Math.round(frac * numUnits - 0.5);
  //       if (0 <= index && index < numUnits) {
  //         return unitIds[index];
  //       } else return undefined;
  //     },
  //     [canvasHeight, margins, unitIds],
  //   );

  //   const handleMouseDown = useCallback(
  //     (e: React.MouseEvent) => {
  //       const boundingRect = e.currentTarget.getBoundingClientRect();
  //       const p = {
  //         x: e.clientX - boundingRect.x,
  //         y: e.clientY - boundingRect.y,
  //       };
  //       const unitId = pixelToUnitId(p);
  //       if (e.shiftKey || e.ctrlKey) {
  //         unitIdSelectionDispatch({ type: "TOGGLE_UNIT", targetUnit: unitId });
  //       } else {
  //         unitIdSelectionDispatch({ type: "UNIQUE_SELECT", targetUnit: unitId });
  //       }
  //     },
  //     [pixelToUnitId, unitIdSelectionDispatch],
  //   );

  //   const handleMouseMove = useCallback(
  //     (e: React.MouseEvent) => {
  //       const boundingRect = e.currentTarget.getBoundingClientRect();
  //       const p = {
  //         x: e.clientX - boundingRect.x,
  //         y: e.clientY - boundingRect.y,
  //       };
  //       const unitId = pixelToUnitId(p);
  //       if (unitId !== undefined) {
  //         setHoveredUnitId(unitId);
  //       }
  //     },
  //     [pixelToUnitId],
  //   );

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    setHoveredUnitId(undefined);
  }, []);

  if (visibleStartTimeSec === undefined) {
    return <div>Loading...</div>;
  }
  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={gridlineOpts}
      onKeyDown={handleKeyDown}
      //   onMouseDown={handleMouseDown}
      //   onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      hideToolbar={hideToolbar}
      yAxisInfo={yAxisInfo}
      showTimeSelectionBar={true}
    />
  );
};

const useSpikeDensityMatrixClient = (outputUrl: string) => {
  const [file, setFile] = useState<RemoteH5FileLindi | null>(null);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const file = await RemoteH5FileLindi.create(outputUrl);
      if (canceled) return;
      setFile(file);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [outputUrl]);

  const [client, setClient] = useState<SpikeDensityMatrixClient | null>(null);
  useEffect(() => {
    setClient(null);
    if (!file) return;
    let canceled = false;
    const load = async () => {
      const client = await SpikeDensityMatrixClient.create(file);
      if (canceled) return;
      setClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [file]);

  return client;
};

export default SpikeDensityPlotWidget;
