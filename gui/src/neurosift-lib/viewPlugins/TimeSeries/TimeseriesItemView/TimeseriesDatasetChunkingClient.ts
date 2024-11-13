/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Canceler,
  RemoteH5Dataset,
  RemoteH5FileX,
} from "../../../remote-h5-file/index";

class TimeseriesDatasetChunkingClient {
  #chunks: { [k: number]: number[][] } = {};
  #noiseLevelForAutoSeparation: number | undefined;
  constructor(
    private nwbFile: RemoteH5FileX,
    private dataset: RemoteH5Dataset,
    public chunkSize: number,
    private o: {
      visibleChannelsRange?: [number, number];
      autoChannelSeparation?: number;
      ignoreConversion?: boolean;
    } = {},
  ) {}
  async getConcatenatedChunk(
    startChunkIndex: number,
    endChunkIndex: number,
    canceler: Canceler,
  ): Promise<{ concatenatedChunk: number[][]; completed: boolean }> {
    if (
      this.o.autoChannelSeparation &&
      this.#noiseLevelForAutoSeparation === undefined
    ) {
      await this.#computeNoiseLevelForAutoSeparation();
    }
    const timer = Date.now();
    const chunks: number[][][] = [];
    let completed = true;
    for (let ii = startChunkIndex; ii < endChunkIndex; ii++) {
      if (!this.#chunks[ii]) {
        // there's a problem -- what if the chunk load gets canceled elsewhere. Not sure what to do.
        await this._loadChunk(ii, canceler);
      }
      chunks.push(this.#chunks[ii]);
      const elapsedSec = (Date.now() - timer) / 1000;
      if (elapsedSec > 2) {
        completed = false;
        break;
      }
    }
    const n1 = sum(chunks.map((ch) => (ch[0] || []).length));
    const concatenatedChunk: number[][] = [];
    const N1 =
      this.dataset.shape.length === 1
        ? 1
        : this.o.visibleChannelsRange
          ? this.o.visibleChannelsRange[1] - this.o.visibleChannelsRange[0]
          : this.dataset.shape[1] || 1;
    for (let i = 0; i < N1; i++) {
      const x: number[] = [];
      for (let j = 0; j < n1; j++) {
        x.push(NaN);
      }
      concatenatedChunk.push(x);
    }
    let i1 = 0;
    for (let ii = startChunkIndex; ii < endChunkIndex; ii++) {
      const chunk = this.#chunks[ii];
      if (chunk) {
        for (let i = 0; i < chunk.length; i++) {
          const separationOffset = this.o.autoChannelSeparation
            ? i *
              this.o.autoChannelSeparation *
              (this.#noiseLevelForAutoSeparation || 0)
            : 0;
          for (let j = 0; j < chunk[i].length; j++) {
            concatenatedChunk[i][i1 + j] = chunk[i][j] + separationOffset;
          }
        }
        i1 += (chunk[0] || []).length;
      }
    }
    return { concatenatedChunk, completed };
  }
  private async _loadChunk(chunkIndex: number, canceler: Canceler) {
    const shape = this.dataset.shape;
    let conversion = this.dataset.attrs["conversion"] || 1;
    // if conversion is NaN, set it to 1
    if (isNaN(conversion)) {
      conversion = 1;
    }
    let offset = this.dataset.attrs["offset"] || 0;
    // if offset is NaN, set it to 0
    if (isNaN(offset)) {
      offset = 0;
    }

    if (this.o.ignoreConversion) {
      conversion = 1;
      offset = 0;
    }

    const i1 = chunkIndex * this.chunkSize;
    const i2 = Math.min(i1 + this.chunkSize, shape[0]);
    let channelSlice: [number, number] = [0, Math.min(shape[1] || 1, 15)]; // for now limit to 15 columns when no channel slice is specified
    // let channelSlice: [number, number] = [0, shape[1] || 1]
    if (this.o.visibleChannelsRange) {
      channelSlice = this.o.visibleChannelsRange;
    }
    const N1 = channelSlice[1] - channelSlice[0];
    if (shape.length > 2)
      throw Error(
        "TimeseriesDatasetChunkingClient not implemented for shape.length > 2",
      );
    const slice: [number, number][] =
      shape.length === 1 ? [[i1, i2]] : [[i1, i2], channelSlice];
    let data = await this.nwbFile.getDatasetData(this.dataset.path, {
      slice,
      canceler,
    });
    if (!data) throw Error(`Unable to get dataset data: ${this.dataset.path}`);
    // data might be BigIntArray - in that case we need to convert it to a regular array
    if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
      const data2: number[] = [];
      for (let i = 0; i < (data as any).length; i++) {
        data2.push(Number(data[i]));
      }
      data = data2 as any;
    }
    const chunk: number[][] = [];
    for (let i = 0; i < N1; i++) {
      const x: number[] = [];
      for (let j = 0; j < i2 - i1; j++) {
        x.push((data as any)[i + j * N1] * conversion + offset);
      }
      chunk.push(x);
    }
    this.#chunks[chunkIndex] = chunk;
  }
  async #computeNoiseLevelForAutoSeparation() {
    await this._loadChunk(0, { onCancel: [] });
    const chunk = this.#chunks[0];
    if (!chunk) return;
    const stdevs: number[] = [];
    const step = 100;
    for (let i = 0; i < chunk.length; i++) {
      for (let j = 0; j < Math.min(chunk[i].length, step * 50); j += step) {
        const section = chunk[i].slice(j, j + step);
        const v = Math.sqrt(sum(section.map((x) => x * x)) / section.length);
        if (!isNaN(v)) stdevs.push(v);
      }
    }
    const medianStdev = median(stdevs);
    this.#noiseLevelForAutoSeparation = medianStdev * 3;
  }
}

const median = (x: number[]) => {
  const y = [...x];
  y.sort();
  if (y.length % 2 === 0) {
    return (y[y.length / 2 - 1] + y[y.length / 2]) / 2;
  } else {
    return y[Math.floor(y.length / 2)];
  }
};

const sum = (x: number[]) => {
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    s += x[i];
  }
  return s;
};

export default TimeseriesDatasetChunkingClient;
