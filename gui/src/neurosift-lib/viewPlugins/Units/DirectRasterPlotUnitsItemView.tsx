/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Hyperlink } from "@fi-sci/misc";
import {
  DatasetDataType,
  RemoteH5FileX,
  RemoteH5Group,
} from "../../remote-h5-file/index";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import RasterPlotView3 from "../../views/RasterPlotView3/RasterPlotView3";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const DirectRasterPlotUnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const [spikeTrainsClient, setSpikeTrainsClient] = useState<
    DirectSpikeTrainsClient | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const client = await DirectSpikeTrainsClient.create(nwbFile, path);
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path]);

  const [visibleUnitIds, setVisibleUnitIds] = useState<(number | string)[]>([]);

  const spikeTrainsClient2 = useDirectSpikeTrainsClientUnitSlice(
    nwbFile,
    path,
    visibleUnitIds,
  );
  if (!spikeTrainsClient2) {
    return <div>Loading spike trains...</div>;
  }

  // const maxNumSpikes = 5e5
  // if (spikeTrainsClient.totalNumSpikes! > maxNumSpikes) {
  //     return <div>Too many spikes to display ({spikeTrainsClient.totalNumSpikes} &gt; {maxNumSpikes})</div>
  // }

  const bottomBarHeight = 25;

  return (
    <div style={{ position: "absolute", width, height }}>
      <RasterPlotView3
        width={width}
        height={height - bottomBarHeight}
        spikeTrainsClient={spikeTrainsClient2}
        // infoMessage={spikeTrainsClient !== spikeTrainsClient2 ? `Showing ${spikeTrainsClient2.unitIds.length} of ${spikeTrainsClient?.unitIds.length} units` : undefined}
        infoMessage=""
      />
      <div
        style={{
          position: "absolute",
          top: height - bottomBarHeight,
          width,
          height: bottomBarHeight,
        }}
      >
        <VisibleUnitsSelector
          visibleUnitIds={visibleUnitIds}
          setVisibleUnitIds={setVisibleUnitIds}
          spikeTrainsClient={spikeTrainsClient}
        />
      </div>
    </div>
  );
};

export const useDirectSpikeTrainsClient = (
  nwbFile: RemoteH5FileX,
  path: string,
): DirectSpikeTrainsClient | undefined => {
  const [spikeTrainsClient, setSpikeTrainsClient] = useState<
    DirectSpikeTrainsClient | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const client = await DirectSpikeTrainsClient.create(nwbFile, path);
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, path]);
  return spikeTrainsClient;
};

export const useDirectSpikeTrainsClientUnitSlice = (
  nwbFile: RemoteH5FileX,
  path: string,
  unitIds: (number | string)[],
): SpikeTrainsClient | undefined => {
  const directSpikeTrainsClient = useDirectSpikeTrainsClient(nwbFile, path);
  return useMemo(() => {
    if (!directSpikeTrainsClient) return undefined;
    if (unitIds.length < directSpikeTrainsClient.unitIds.length) {
      return new DirectSpikeTrainsClientUnitSlice(
        directSpikeTrainsClient,
        unitIds,
      );
    } else {
      return directSpikeTrainsClient;
    }
  }, [directSpikeTrainsClient, unitIds]);
};

export interface SpikeTrainsClient {
  startTimeSec: number;
  endTimeSec: number;
  blockSizeSec: number;
  totalNumSpikes: number | undefined;
  numSpikesForUnit(unitId: number | string): number | undefined;
  unitIds: (number | string)[];
  getData(
    blockStartIndex: number,
    blockEndIndex: number,
    options: { unitIds?: (number | string)[] },
  ): Promise<{ unitId: number | string; spikeTimesSec: number[] }[]>;
}

class DirectSpikeTrainsClientUnitSlice {
  #unitIds: (number | string)[];
  constructor(
    private client: DirectSpikeTrainsClient,
    unitIds: (number | string)[],
  ) {
    this.#unitIds = unitIds;
  }
  async initialize() {}
  get startTimeSec() {
    return this.client.startTimeSec;
  }
  get endTimeSec() {
    return this.client.endTimeSec;
  }
  get blockSizeSec() {
    return this.client.blockSizeSec;
  }
  get unitIds() {
    return this.#unitIds;
  }
  numSpikesForUnit(unitId: number | string) {
    return this.client.numSpikesForUnit(unitId);
  }
  async getData(
    blockStartIndex: number,
    blockEndIndex: number,
    options: { unitIds?: (number | string)[] } = {},
  ) {
    const options2 = {
      ...options,
      unitIds: this.#unitIds.filter(
        (id) => !options.unitIds || options.unitIds.includes(id),
      ),
    };
    return this.client.getData(blockStartIndex, blockEndIndex, options2);
  }
  get totalNumSpikes() {
    let ret = 0;
    for (const id of this.#unitIds) {
      const n = this.client.numSpikesForUnit(id);
      if (n === undefined) return undefined;
      ret += n;
    }
    return ret;
  }
}

export class DirectSpikeTrainsClient {
  #blockSizeSec = 60 * 1;
  constructor(
    private nwbFile: RemoteH5FileX,
    private path: string,
    public unitIds: (number | string)[],
    private spikeTimesIndices: DatasetDataType,
    public startTimeSec: number,
    public endTimeSec: number,
    private spike_or_event: "spike" | "event" | undefined,
    group: RemoteH5Group | undefined,
  ) {}
  static async create(nwbFile: RemoteH5FileX, path: string) {
    const group = await nwbFile.getGroup(path);
    let spike_or_event: "spike" | "event" | undefined;
    if (group && group.datasets.find((ds) => ds.name === "spike_times")) {
      spike_or_event = "spike";
    } else if (
      group &&
      group.datasets.find((ds) => ds.name === "event_times")
    ) {
      spike_or_event = "event";
    } else {
      spike_or_event = undefined;
    }
    let unitIds = (await nwbFile.getDatasetData(`${path}/id`, {})) as any as
      | any[]
      | undefined;
    if (!unitIds) throw Error(`Unable to find unit ids for ${path}`);

    // if unitIds is a Typed array, convert it to a regular array
    const unitIds2: number[] = [];
    for (let i = 0; i < unitIds.length; i++) {
      unitIds2.push(unitIds[i]);
    }
    unitIds = unitIds2;

    const spikeTimesIndices = await nwbFile.getDatasetData(
      `${path}/${spike_or_event}_times_index`,
      {},
    );
    const v1 = await nwbFile.getDatasetData(`${path}/${spike_or_event}_times`, {
      slice: [[0, 1]],
    });
    const n = spikeTimesIndices
      ? spikeTimesIndices[spikeTimesIndices.length - 1]
      : 0;
    const v2 = await nwbFile.getDatasetData(`${path}/${spike_or_event}_times`, {
      slice: [[n - 1, n]],
    });
    const startTimeSec = v1 ? v1[0] : 0;
    const endTimeSec = v2 ? v2[0] : 1;
    if (!spikeTimesIndices)
      throw Error(`Unable to find spike times indices for ${path}`);
    return new DirectSpikeTrainsClient(
      nwbFile,
      path,
      unitIds,
      spikeTimesIndices,
      startTimeSec,
      endTimeSec,
      spike_or_event,
      group,
    );
  }
  get blockSizeSec() {
    return this.#blockSizeSec;
  }
  get totalNumSpikes() {
    if (!this.spikeTimesIndices) return undefined;
    if (!this.spikeTimesIndices) return undefined;
    return this.spikeTimesIndices[this.spikeTimesIndices.length - 1];
  }
  numSpikesForUnit(unitId: number | string) {
    const ii = this.unitIds.indexOf(unitId);
    if (ii < 0) return undefined;
    const i1 = ii === 0 ? 0 : this.spikeTimesIndices[ii - 1];
    const i2 = this.spikeTimesIndices[ii];
    return i2 - i1;
  }
  async getData(
    blockStartIndex: number,
    blockEndIndex: number,
    options: { unitIds?: (number | string)[] } = {},
  ) {
    // if (!this.#spikeTimes) throw Error('Unexpected: spikeTimes not initialized')
    const ret: {
      unitId: number | string;
      spikeTimesSec: number[];
    }[] = [];
    const t1 = this.startTimeSec! + blockStartIndex * this.blockSizeSec;
    const t2 = this.startTimeSec! + blockEndIndex * this.blockSizeSec;
    for (let ii = 0; ii < this.unitIds.length; ii++) {
      if (options.unitIds) {
        if (!options.unitIds.includes(this.unitIds[ii])) continue;
      }
      const i1 = ii === 0 ? 0 : this.spikeTimesIndices[ii - 1];
      const i2 = this.spikeTimesIndices[ii];

      const path = this.path;
      const tt0 = await this.nwbFile.getDatasetData(
        `${path}/${this.spike_or_event}_times`,
        { slice: [[i1, i2]] },
      );

      if (tt0) {
        const tt = Array.from(tt0.filter((t: number) => t >= t1 && t < t2));
        ret.push({
          unitId: this.unitIds[ii],
          spikeTimesSec: tt,
        });
      }
    }
    return ret;
  }
  async getUnitSpikeTrain(
    unitId: number | string,
    o: { canceler?: { onCancel: (() => void)[] } } = {},
  ) {
    const ii = this.unitIds.indexOf(unitId);
    if (ii < 0) throw Error(`Unexpected: unitId not found: ${unitId}`);
    const i1 = ii === 0 ? 0 : this.spikeTimesIndices[ii - 1];
    const i2 = this.spikeTimesIndices[ii];
    const path = this.path;
    const tt0 = await this.nwbFile.getDatasetData(
      `${path}/${this.spike_or_event}_times`,
      { slice: [[i1, i2]], canceler: o.canceler },
    );
    if (tt0) {
      return Array.from(tt0);
    } else {
      return [];
    }
  }
}

type VisibleUnitsSelectorProps = {
  visibleUnitIds: (number | string)[];
  setVisibleUnitIds: (ids: (number | string)[]) => void;
  spikeTrainsClient?: DirectSpikeTrainsClient;
};

const VisibleUnitsSelector: FunctionComponent<VisibleUnitsSelectorProps> = ({
  visibleUnitIds,
  setVisibleUnitIds,
  spikeTrainsClient,
}) => {
  const [maxNumSpikesPerViewRange, setMaxNumSpikesPerViewRange] = useState(2e5);
  const viewRanges: [number, number][] | undefined = useMemo(() => {
    if (!spikeTrainsClient) return undefined;
    const ret: [number, number][] = [];
    let ct = 0;
    let minIndex = 0;
    for (let i = 0; i < spikeTrainsClient.unitIds.length; i++) {
      const id = spikeTrainsClient.unitIds[i];
      const numSpikes = spikeTrainsClient.numSpikesForUnit(id);
      ct += numSpikes || 0;
      if (ct > maxNumSpikesPerViewRange) {
        ret.push([minIndex, i]);
        minIndex = i;
        ct = 0;
      }
    }
    if (minIndex < spikeTrainsClient.unitIds.length) {
      ret.push([minIndex, spikeTrainsClient.unitIds.length]);
    }
    return ret;
  }, [spikeTrainsClient, maxNumSpikesPerViewRange]);

  const [currentViewRangeIndex, setCurrentViewRangeIndex] = useState(0);

  const visibleUnitIndexRange = useMemo(() => {
    if (!viewRanges) return [0, 0];
    return viewRanges[currentViewRangeIndex];
  }, [viewRanges, currentViewRangeIndex]);

  useEffect(() => {
    if (!spikeTrainsClient) return;
    const x: (number | string)[] = [];
    for (let i = visibleUnitIndexRange[0]; i < visibleUnitIndexRange[1]; i++) {
      x.push(spikeTrainsClient.unitIds[i]);
    }
    setVisibleUnitIds(x);
  }, [visibleUnitIndexRange, spikeTrainsClient, setVisibleUnitIds]);

  const nextButton = useMemo(() => {
    if (!viewRanges) return undefined;
    if (currentViewRangeIndex >= viewRanges.length - 1) return undefined;
    return (
      <Hyperlink
        onClick={() => {
          setCurrentViewRangeIndex(currentViewRangeIndex + 1);
        }}
      >
        next
      </Hyperlink>
    );
  }, [currentViewRangeIndex, viewRanges]);

  const prevButton = useMemo(() => {
    if (!viewRanges) return undefined;
    if (currentViewRangeIndex <= 0) return undefined;
    return (
      <Hyperlink
        onClick={() => {
          setCurrentViewRangeIndex(currentViewRangeIndex - 1);
        }}
      >
        prev
      </Hyperlink>
    );
  }, [currentViewRangeIndex, viewRanges]);

  const viewMoreUnitsButton = useMemo(() => {
    if (!viewRanges) return undefined;
    if (viewRanges.length === 1) return undefined;
    return (
      <Hyperlink
        onClick={() => {
          setMaxNumSpikesPerViewRange((x) => x * 3);
          setCurrentViewRangeIndex(0);
        }}
      >
        view more units
      </Hyperlink>
    );
  }, [viewRanges]);

  const viewFewerUnitsButton = useMemo(() => {
    if (!viewRanges) return undefined;
    return (
      <Hyperlink
        onClick={() => {
          setMaxNumSpikesPerViewRange((x) => x / 3);
          setCurrentViewRangeIndex(0);
        }}
      >
        view fewer units
      </Hyperlink>
    );
  }, [viewRanges]);

  if (!spikeTrainsClient) return <div>Loading...</div>;
  if (visibleUnitIndexRange[1] === visibleUnitIndexRange[0])
    return <div>...</div>;
  return (
    <div style={{ userSelect: "none" }}>
      Viewing units&nbsp;
      {visibleUnitIndexRange[0] + 1} - {visibleUnitIndexRange[1]} of{" "}
      {spikeTrainsClient.unitIds.length}
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      {prevButton && prevButton}
      &nbsp;
      {nextButton && nextButton}
      &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;
      {viewMoreUnitsButton && viewMoreUnitsButton}
      &nbsp;|&nbsp;
      {viewFewerUnitsButton && viewFewerUnitsButton}
      &nbsp;|
    </div>
  );
};

export default DirectRasterPlotUnitsItemView;
