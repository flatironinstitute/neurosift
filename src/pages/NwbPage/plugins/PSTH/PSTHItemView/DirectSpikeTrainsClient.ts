/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatasetDataType } from "@remote-h5-file";
import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";

export class DirectSpikeTrainsClient {
  #timestampFinders: { [key: number]: TimestampFinder } = {};
  constructor(
    private nwbUrl: string,
    private path: string,
    public unitIds: string[],
    private spikeTimesIndices: DatasetDataType,
    public startTimeSec: number,
    public endTimeSec: number,
    private spike_or_event: "spike" | "event" | undefined,
  ) {}
  static async create(nwbUrl: string, path: string) {
    const group = await getHdf5Group(nwbUrl, path);
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
    let unitIds = (await getHdf5DatasetData(
      nwbUrl,
      `${path}/id`,
      {},
    )) as any as any[] | undefined;
    if (!unitIds) throw Error(`Unable to find unit ids for ${path}`);

    // if unitIds is a Typed array, convert it to a regular array
    const unitIds2: string[] = [];
    for (let i = 0; i < unitIds.length; i++) {
      unitIds2.push(unitIds[i].toString());
    }
    unitIds = unitIds2;

    // ensure strings
    unitIds = unitIds.map((val) => val.toString());

    const spikeTimesIndices = await getHdf5DatasetData(
      nwbUrl,
      `${path}/${spike_or_event}_times_index`,
      {},
    );
    const v1 = await getHdf5DatasetData(
      nwbUrl,
      `${path}/${spike_or_event}_times`,
      {
        slice: [[0, 1]],
      },
    );
    const n = spikeTimesIndices
      ? spikeTimesIndices[spikeTimesIndices.length - 1]
      : 0;
    const v2 = await getHdf5DatasetData(
      nwbUrl,
      `${path}/${spike_or_event}_times`,
      {
        slice: [[n - 1, n]],
      },
    );
    const startTimeSec = v1 ? v1[0] : 0;
    const endTimeSec = v2 ? v2[0] : 1;
    if (!spikeTimesIndices)
      throw Error(`Unable to find spike times indices for ${path}`);
    return new DirectSpikeTrainsClient(
      nwbUrl,
      path,
      unitIds,
      spikeTimesIndices,
      startTimeSec,
      endTimeSec,
      spike_or_event,
    );
  }
  get totalNumSpikes() {
    if (!this.spikeTimesIndices) return undefined;
    if (!this.spikeTimesIndices) return undefined;
    return this.spikeTimesIndices[this.spikeTimesIndices.length - 1];
  }
  _createTimestampFinder(unitIndex: number) {
    const i1 = unitIndex === 0 ? 0 : this.spikeTimesIndices[unitIndex - 1];
    const i2 = this.spikeTimesIndices[unitIndex];
    const model = {
      length: i2 - i1,
      getChunk: async (a1: number, a2: number) => {
        return await getHdf5DatasetData(
          this.nwbUrl,
          `${this.path}/${this.spike_or_event}_times`,
          { slice: [[i1 + a1, i1 + a2]] },
        );
      },
    };
    this.#timestampFinders[unitIndex] = new TimestampFinder(model);
  }
  numSpikesForUnit(unitId: number | string) {
    const ii = this.unitIds.indexOf(unitId.toString());
    if (ii < 0) return undefined;
    const i1 = ii === 0 ? 0 : this.spikeTimesIndices[ii - 1];
    const i2 = this.spikeTimesIndices[ii];
    return i2 - i1;
  }
  async getUnitSpikeTrain(
    unitId: number | string,
    o: { canceler?: { onCancel: (() => void)[] } } = {},
  ) {
    const ii = this.unitIds.indexOf(unitId.toString());
    if (ii < 0) throw Error(`Unexpected: unitId not found: ${unitId}`);
    const i1 = ii === 0 ? 0 : this.spikeTimesIndices[ii - 1];
    const i2 = this.spikeTimesIndices[ii];
    const path = this.path;
    const tt0 = await getHdf5DatasetData(
      this.nwbUrl,
      `${path}/${this.spike_or_event}_times`,
      { slice: [[i1, i2]], canceler: o.canceler },
    );
    if (tt0) {
      return Array.from(tt0);
    } else {
      return [];
    }
  }
  async getUnitSpikeTrainForTimeRange(
    unitId: number | string,
    t1: number,
    t2: number,
    // o: { canceler?: { onCancel: (() => void)[] } } = {},
  ) {
    const ii = this.unitIds.indexOf(unitId.toString());
    if (ii < 0) throw Error(`Unexpected: unitId not found: ${unitId}`);
    if (!this.#timestampFinders[ii]) {
      this._createTimestampFinder(ii);
    }
    const finder = this.#timestampFinders[ii];
    const index1 = await finder.getDataIndexForTime(t1);
    const index2 = await finder.getDataIndexForTime(t2);
    const tt = await finder.getDataForIndices(index1, index2);
    return tt;
  }
}

export class ChunkedDirectSpikeTrainsClient {
  #chunks: { [key: string]: number[] } = {};
  constructor(
    private client: DirectSpikeTrainsClient,
    private chunkDurationSec: number,
  ) {}
  static async create(nwbUrl: string, path: string, chunkDurationSec = 30) {
    const client = await DirectSpikeTrainsClient.create(nwbUrl, path);
    return new ChunkedDirectSpikeTrainsClient(client, chunkDurationSec);
  }
  get totalNumSpikes() {
    return this.client.totalNumSpikes;
  }
  get unitIds() {
    return this.client.unitIds;
  }
  get startTimeSec() {
    return this.client.startTimeSec;
  }
  get endTimeSec() {
    return this.client.endTimeSec;
  }
  numSpikesForUnit(unitId: number | string) {
    return this.client.numSpikesForUnit(unitId);
  }
  async _loadChunk(unitId: string, chunkIndex: number) {
    const key = `${unitId}:${chunkIndex}`;
    if (key in this.#chunks) return;
    const t1 = chunkIndex * this.chunkDurationSec;
    const t2 = (chunkIndex + 1) * this.chunkDurationSec;
    const tt = await this.client.getUnitSpikeTrainForTimeRange(unitId, t1, t2);
    this.#chunks[key] = tt;
  }
  async getUnitSpikeTrainForTimeRange(
    unitId: number | string,
    t1: number,
    t2: number,
  ) {
    const chunkIndex1 = Math.floor(t1 / this.chunkDurationSec);
    const chunkIndex2 = Math.floor(t2 / this.chunkDurationSec);

    // ensure we have loaded the chunks
    const promises = [];
    for (
      let chunkIndex = chunkIndex1;
      chunkIndex <= chunkIndex2;
      chunkIndex++
    ) {
      promises.push(this._loadChunk(unitId.toString(), chunkIndex));
    }
    await Promise.all(promises);

    const ret: number[] = [];
    for (
      let chunkIndex = chunkIndex1;
      chunkIndex <= chunkIndex2;
      chunkIndex++
    ) {
      const key = `${unitId}:${chunkIndex}`;
      const tt = this.#chunks[key];
      const t1a = Math.max(t1, chunkIndex * this.chunkDurationSec);
      const t2a = Math.min((chunkIndex + 1) * this.chunkDurationSec, t2);
      for (const t of tt) {
        if (t >= t1a && t < t2a) {
          ret.push(t);
        }
      }
    }
    return ret;
  }
}

interface TimestampsModel {
  length: number;
  getChunk(a1: number, a2: number): Promise<DatasetDataType | undefined>;
}

class TimestampFinder {
  #chunkSize = 10000;
  #chunks: { [key: number]: DatasetDataType } = {};
  constructor(
    private timestampsModel: TimestampsModel,
    // private estimatedSamplingFrequency: number,
  ) {}
  async getDataIndexForTime(time: number): Promise<number> {
    let iLower = 0;
    let iUpper = this.timestampsModel.length - 1;
    if (iUpper === iLower) return iLower;
    let tLower = await this._get(iLower);
    let tUpper = await this._get(iUpper);
    if (isNaN(tUpper)) {
      // sometimes the final timestamp is NaN, in that case use the second-to-last timestamp
      // this happens in a Frank Lab dataset: http://localhost:3000/neurosift/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/645/10d/64510d67-fab1-45ab-abc3-b18c9738412c
      tUpper = await this._get(iUpper - 1);
      iUpper = iUpper - 1;
    }
    while (iUpper - iLower > 1) {
      if (time < tLower) {
        return iLower;
      }
      if (time > tUpper) {
        return iUpper;
      }
      let estimatedIndex =
        iLower +
        Math.floor(((iUpper - iLower) * (time - tLower)) / (tUpper - tLower));
      if (estimatedIndex <= iLower)
        estimatedIndex = Math.floor((iUpper + iLower) / 2);
      if (estimatedIndex >= iUpper)
        estimatedIndex = Math.floor((iUpper + iLower) / 2);
      const estimatedT = await this._get(estimatedIndex);
      if (estimatedT === time) {
        return estimatedIndex;
      }
      if (estimatedT < time) {
        iLower = estimatedIndex;
        tLower = estimatedT;
      } else {
        iUpper = estimatedIndex;
        tUpper = estimatedT;
      }
    }
    const distToLower = Math.abs(time - tLower);
    const distToUpper = Math.abs(time - tUpper);
    if (distToLower < distToUpper) return iLower;
    else return iUpper;
  }
  async getDataForIndices(i1: number, i2: number) {
    const ichunk1 = Math.floor(i1 / this.#chunkSize);
    const ichunk2 = Math.floor(i2 / this.#chunkSize);
    const ret: number[] = [];
    for (let ichunk = ichunk1; ichunk <= ichunk2; ichunk++) {
      const a1 = ichunk * this.#chunkSize;
      let a2 = (ichunk + 1) * this.#chunkSize;
      if (a2 > this.timestampsModel.length) a2 = this.timestampsModel.length;
      const chunk = await this.timestampsModel.getChunk(a1, a2);
      if (!chunk) throw Error(`Unable to get chunk ${ichunk}`);
      const i1a = Math.max(i1, a1);
      const i2a = Math.min(i2, a2);
      for (let i = i1a; i < i2a; i++) {
        ret.push(chunk[i - a1]);
      }
    }
    return ret;
  }
  async _get(i: number) {
    const chunkIndex = Math.floor(i / this.#chunkSize);
    if (!(chunkIndex in this.#chunks)) {
      const a1 = chunkIndex * this.#chunkSize;
      let a2 = (chunkIndex + 1) * this.#chunkSize;
      if (a2 > this.timestampsModel.length) a2 = this.timestampsModel.length;
      const chunk = await this.timestampsModel.getChunk(a1, a2);
      if (chunk) {
        this.#chunks[chunkIndex] = chunk;
      } else {
        console.warn("Unable to get chunk", chunkIndex);
      }
    }
    return this.#chunks[chunkIndex][i - chunkIndex * this.#chunkSize];
  }
}
