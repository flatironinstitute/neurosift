/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  DatasetDataType,
  getRemoteH5File,
  RemoteH5FileX,
} from "../../remote-h5-file/index";

class SpikeTrainsClientFromRemoteNwb {
  // #nwbFile: RemoteH5FileX | undefined;
  #blockSizeSec = 60 * 5;
  constructor(
    // private url: string,
    private nwbFile: RemoteH5FileX,
    public unitIds: (string | number)[],
    public spikeTimesIndices: DatasetDataType,
    public startTimeSec: number,
    public endTimeSec: number,
  ) {}
  static async create(url: string) {
    const nwbFile = await getRemoteH5File(url);
    const unitIds = (await nwbFile.getDatasetData("/units/id", {})) as any as (
      | string
      | number
    )[];
    if (!unitIds) throw Error(`Not able to get /units/id from ${url}`);
    const spikeTimesIndices = await nwbFile.getDatasetData(
      "/units/spike_times_index",
      {},
    );
    if (!spikeTimesIndices)
      throw Error(`Not able to get spike_times_index dataset: ${url}`);
    const v1 = await nwbFile.getDatasetData("/units/spike_times", {
      slice: [[0, 1]],
    });
    if (!v1) throw Error(`Not able to get spike_times dataset: ${url}`);
    const n = spikeTimesIndices[spikeTimesIndices.length - 1];
    const v2 = await nwbFile.getDatasetData("/units/spike_times", {
      slice: [[n - 1, n]],
    });
    if (!v2) throw Error(`Not able to get spike_times dataset: ${url}`);
    const startTimeSec = v1[0];
    const endTimeSec = v2[0];
    return new SpikeTrainsClientFromRemoteNwb(
      // url,
      nwbFile,
      unitIds,
      spikeTimesIndices,
      startTimeSec,
      endTimeSec,
    );
  }
  get blockSizeSec() {
    return this.#blockSizeSec;
  }
  async getData(blockStartIndex: number, blockEndIndex: number) {
    // if (!this.#spikeTimes) throw Error('Unexpected: spikeTimes not initialized')
    const ret: {
      unitId: number | string;
      spikeTimesSec: number[];
    }[] = [];
    const t1 = this.startTimeSec! + blockStartIndex * this.#blockSizeSec;
    const t2 = this.startTimeSec! + blockEndIndex * this.#blockSizeSec;
    for (let ii = 0; ii < this.unitIds.length; ii++) {
      const i1 = ii === 0 ? 0 : this.spikeTimesIndices[ii - 1];
      const i2 = this.spikeTimesIndices[ii];

      const tt0 = await this.nwbFile.getDatasetData("/units/spike_times", {
        slice: [[i1, Math.min(i2, i1 + 100)]],
      });

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
  get totalNumSpikes() {
    if (!this.spikeTimesIndices) return undefined;
    return this.spikeTimesIndices[this.spikeTimesIndices.length - 1];
  }
}

// const minOfArray = (x: DatasetDataType) => {
//     let min = Infinity
//     for (let i = 0; i < x.length; i++) {
//         if (x[i] < min) min = x[i]
//     }
//     return min
// }

// const maxOfArray = (x: DatasetDataType) => {
//     let max = -Infinity
//     for (let i = 0; i < x.length; i++) {
//         if (x[i] > max) max = x[i]
//     }
//     return max
// }

export default SpikeTrainsClientFromRemoteNwb;
