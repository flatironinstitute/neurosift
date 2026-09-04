import { getHdf5DatasetData, Hdf5Dataset, Hdf5Group } from "@hdf5Interface";
import {
  IrregularTimeseriesTimestampsClient,
  RegularTimeseriesTimestampsClient,
} from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";

class TimeseriesClient {
  private labels?: string[];

  private constructor(
    private nwbUrl: string,
    private dataDataset: Hdf5Dataset,
    private timestampsClient:
      | IrregularTimeseriesTimestampsClient
      | RegularTimeseriesTimestampsClient,
    private startTimeValue: number,
    private endTimeValue: number,
    private samplingFrequencyValue: number,
  ) {
    this.labels = dataDataset.attrs?.labels;
  }

  static async create(
    nwbUrl: string,
    group: Hdf5Group,
  ): Promise<TimeseriesClient> {
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) throw new Error("No data dataset found");

    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");

    const timestampsClient = hasTimestamps
      ? new IrregularTimeseriesTimestampsClient(nwbUrl, group.path)
      : new RegularTimeseriesTimestampsClient(nwbUrl, group.path);
    await timestampsClient.initialize();

    return new TimeseriesClient(
      nwbUrl,
      dataDataset,
      timestampsClient,
      timestampsClient.startTime!,
      timestampsClient.endTime!,
      timestampsClient.estimatedSamplingFrequency!,
    );
  }

  get startTime(): number {
    return this.startTimeValue;
  }

  get endTime(): number {
    return this.endTimeValue;
  }

  get duration(): number {
    return this.endTimeValue - this.startTimeValue;
  }

  get samplingFrequency(): number {
    return this.samplingFrequencyValue;
  }

  get numChannels(): number {
    const d = this.dataDataset;
    if (d.shape.length === 0) return 0;
    if (d.shape.length === 1) return 1;
    if (d.shape.length > 2)
      throw new Error("Invalid shape for timeseries data");
    return d.shape[1];
  }

  get numSamples(): number {
    const d = this.dataDataset;
    if (d.shape.length === 0) return 0;
    if (d.shape.length === 1) return d.shape[0];
    if (d.shape.length > 2)
      throw new Error("Invalid shape for timeseries data");
    return d.shape[0];
  }

  isLabeledEvents(): boolean {
    return this.labels !== undefined;
  }

  getLabels(): string[] | undefined {
    return this.labels;
  }

  private async getDataForIndices(
    iStart: number,
    iEnd: number,
    channelStart: number,
    channelEnd: number,
  ): Promise<{
    timestamps: number[];
    data: number[][]; // one for each channel
  }> {
    if (iEnd < iStart) throw new Error("iEnd must be >= iStart");
    const timestamps = await this.timestampsClient.getTimestampsForDataIndices(
      iStart,
      iEnd,
    );
    const data = await getHdf5DatasetData(this.nwbUrl, this.dataDataset.path, {
      slice: [
        [iStart, iEnd],
        [channelStart, channelEnd],
      ],
    });
    if (!data) throw new Error("Unable to get data");
    if (!timestamps) throw new Error("Unable to get timestamps");

    // Apply conversion and offset from dataset attributes
    let conversion = this.dataDataset.attrs?.conversion ?? 1;
    if (isNaN(conversion)) conversion = 1;
    let offset = this.dataDataset.attrs?.offset ?? 0;
    if (isNaN(offset)) offset = 0;

    const data2: number[][] = [];
    // first fill it with zeros
    for (let i = 0; i < channelEnd - channelStart; i++) {
      data2.push(new Array(iEnd - iStart).fill(0));
    }
    // need to transpose the data
    for (let i = 0; i < iEnd - iStart; i++) {
      for (let j = 0; j < channelEnd - channelStart; j++) {
        data2[j][i] =
          data[i * (channelEnd - channelStart) + j] * conversion + offset;
      }
    }
    return {
      data: data2,
      timestamps: Array.from(timestamps),
    };
  }

  async getDataForTimeRange(
    tStart: number,
    tEnd: number,
    channelStart: number,
    channelEnd: number,
  ) {
    if (tStart > tEnd) throw new Error("tStart must be <= tEnd");
    // getDataIndexForTime returns the index of the sample nearest to the
    // requested time, which may lie on either side of it. Load one sample
    // past the nearest-to-tEnd index (it may itself be before tEnd) and then
    // keep exactly the samples whose timestamps fall in [tStart, tEnd).
    const iStart = await this.timestampsClient.getDataIndexForTime(tStart);
    const iEnd = await this.timestampsClient.getDataIndexForTime(tEnd);
    if (iStart > iEnd) {
      console.warn(
        "iStart must be <= iEnd: Timestamps are probably not sorted",
        {
          tStart,
          tEnd,
          iStart,
          iEnd,
        },
      );
      return {
        timestamps: [],
        data: [],
      };
    }
    const iEndInclusive = Math.min(iEnd + 1, this.numSamples);
    const loaded = await this.getDataForIndices(
      iStart,
      iEndInclusive,
      channelStart,
      channelEnd,
    );
    return trimToTimeRange(loaded, tStart, tEnd);
  }
}

// Keep only the samples whose timestamp lies in [tStart, tEnd).
export const trimToTimeRange = (
  loaded: { timestamps: number[]; data: number[][] },
  tStart: number,
  tEnd: number,
): { timestamps: number[]; data: number[][] } => {
  const keep: number[] = [];
  for (let k = 0; k < loaded.timestamps.length; k++) {
    const t = loaded.timestamps[k];
    if (t >= tStart && t < tEnd) keep.push(k);
  }
  if (keep.length === loaded.timestamps.length) return loaded;
  return {
    timestamps: keep.map((k) => loaded.timestamps[k]),
    data: loaded.data.map((channel) => keep.map((k) => channel[k])),
  };
};

interface TimeseriesChunk {
  startTime: number;
  endTime: number;
  startChannel: number;
  endChannel: number;
  timestamps: number[];
  data: number[][];
}

// export const ChunkedTimeseriesClient = TimeseriesClient;

export class ChunkedTimeseriesClient {
  private chunks: Map<string, TimeseriesChunk> = new Map();

  private constructor(
    private client: TimeseriesClient,
    public chunkSizeSec: number,
    private chunkSizeNumChannels: number,
  ) {}

  static async create(
    nwbUrl: string,
    group: Hdf5Group,
    {
      chunkSizeSec,
      chunkSizeNumChannels,
    }: { chunkSizeSec?: number; chunkSizeNumChannels?: number },
  ): Promise<ChunkedTimeseriesClient> {
    const client = await TimeseriesClient.create(nwbUrl, group);
    if (chunkSizeSec === undefined) {
      const estSamplingFreq = client.samplingFrequency;
      if (estSamplingFreq === 0) {
        throw new Error("Unable to determine sampling frequency");
      }
      const numChannels = client.numChannels;
      const chunkSizeMsec = Math.ceil(
        // warning: if this is too large, I've notice some problems with the ChunkedTimeseriesClient
        (1000 * 1e5) / estSamplingFreq / numChannels,
      );
      chunkSizeSec = chunkSizeMsec / 1000;
    }
    if (chunkSizeNumChannels === undefined) {
      chunkSizeNumChannels = 8;
    }
    return new ChunkedTimeseriesClient(
      client,
      chunkSizeSec,
      chunkSizeNumChannels,
    );
  }

  private getChunkTimeIndex(time: number): number {
    return Math.floor(time / this.chunkSizeSec);
  }

  // Index of the last chunk touched by a half-open range ending at tEnd. A
  // range that ends exactly on a chunk boundary does not touch the chunk
  // that starts there.
  private getLastChunkTimeIndex(tStart: number, tEnd: number): number {
    return Math.max(
      this.getChunkTimeIndex(tStart),
      Math.ceil(tEnd / this.chunkSizeSec) - 1,
    );
  }

  private getChunkChannelIndex(channel: number): number {
    return Math.floor(channel / this.chunkSizeNumChannels);
  }

  private getLastChunkChannelIndex(
    channelStart: number,
    channelEnd: number,
  ): number {
    return Math.max(
      this.getChunkChannelIndex(channelStart),
      this.getChunkChannelIndex(channelEnd - 1),
    );
  }

  private async loadChunk(
    chunkIndex: number,
    channelIndex: number,
  ): Promise<TimeseriesChunk> {
    const chunkKey = `${chunkIndex}-${channelIndex}`;
    if (this.chunks.has(chunkKey)) {
      return this.chunks.get(chunkKey)!;
    }

    const startTime = chunkIndex * this.chunkSizeSec;
    const endTime = (chunkIndex + 1) * this.chunkSizeSec;
    const startChannel = channelIndex * this.chunkSizeNumChannels;
    const endChannel = Math.min(
      (channelIndex + 1) * this.chunkSizeNumChannels,
      this.numChannels,
    );

    const result = await this.client.getDataForTimeRange(
      startTime,
      endTime,
      startChannel,
      endChannel,
    );

    const chunk: TimeseriesChunk = {
      startTime,
      endTime,
      startChannel,
      endChannel,
      timestamps: result.timestamps,
      data: result.data,
    };

    this.chunks.set(chunkKey, chunk);
    return chunk;
  }

  private async ensureChunksLoaded(
    startChunkIndex: number,
    endChunkIndex: number,
    startChannelIndex: number,
    endChannelIndex: number,
  ) {
    const promises: Promise<TimeseriesChunk>[] = [];

    for (let i = startChunkIndex; i <= endChunkIndex; i++) {
      for (let j = startChannelIndex; j <= endChannelIndex; j++) {
        const chunkKey = `${i}-${j}`;
        if (!this.chunks.has(chunkKey)) {
          promises.push(this.loadChunk(i, j));
        }
      }
    }

    await Promise.all(promises);
  }

  async getDataForTimeRange(
    tStart: number,
    tEnd: number,
    channelStart: number,
    channelEnd: number,
  ) {
    const startChunkIndex = this.getChunkTimeIndex(tStart);
    const endChunkIndex = this.getLastChunkTimeIndex(tStart, tEnd);
    const startChannelIndex = this.getChunkChannelIndex(channelStart);
    const endChannelIndex = this.getLastChunkChannelIndex(
      channelStart,
      channelEnd,
    );

    await this.ensureChunksLoaded(
      startChunkIndex,
      endChunkIndex,
      startChannelIndex,
      endChannelIndex,
    );

    const timestamps: number[] = [];
    const data: number[][] = [];
    for (let m = channelStart; m < channelEnd; m++) {
      data.push([]);
    }

    // let's go through the chunks and fill in the data
    for (let i = startChunkIndex; i <= endChunkIndex; i++) {
      for (let j = startChannelIndex; j <= endChannelIndex; j++) {
        const chunkKey = `${i}-${j}`;
        const chunk = this.chunks.get(chunkKey)!;
        // Each sample belongs to exactly one chunk by its timestamp, so
        // restrict to this chunk's own interval as well as the request.
        const tStartChunk = Math.max(tStart, chunk.startTime);
        const tEndChunk = Math.min(tEnd, chunk.endTime);
        const timeIndsToUse = [];
        for (let k = 0; k < chunk.timestamps.length; k++) {
          if (
            chunk.timestamps[k] >= tStartChunk &&
            chunk.timestamps[k] < tEndChunk
          ) {
            timeIndsToUse.push(k);
          }
        }
        // if this is the first channel, let's fill in the timestamps
        if (j === startChannelIndex) {
          for (const k of timeIndsToUse) {
            timestamps.push(chunk.timestamps[k]);
          }
        }
        for (let m = channelStart; m < channelEnd; m++) {
          const m2 = m - chunk.startChannel;
          if (0 <= m2 && m2 < chunk.data.length) {
            const data2 = chunk.data[m2];
            for (const k of timeIndsToUse) {
              data[m - channelStart].push(data2[k]);
            }
          }
        }
      }
    }

    return {
      timestamps,
      data,
    };
  }

  get startTime(): number {
    return this.client.startTime;
  }

  get endTime(): number {
    return this.client.endTime;
  }

  get duration(): number {
    return this.client.endTime - this.client.startTime;
  }

  get samplingFrequency(): number {
    return this.client.samplingFrequency;
  }

  get numChannels(): number {
    return this.client.numChannels;
  }

  get numSamples(): number {
    return this.client.numSamples;
  }

  isLabeledEvents(): boolean {
    return this.client.isLabeledEvents();
  }

  getLabels(): string[] | undefined {
    return this.client.getLabels();
  }
}

export default TimeseriesClient;
