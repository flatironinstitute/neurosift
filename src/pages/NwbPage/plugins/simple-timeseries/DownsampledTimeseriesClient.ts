import { Hdf5Group } from "@hdf5Interface";
import { ChunkedTimeseriesClient } from "./TimeseriesClient";
import { LTTB } from "downsample";

export class DownsampledChunkedTimeseriesClient {
  private baseClient: ChunkedTimeseriesClient;
  private downsampleFactor: number;
  private downsampleMethod: "decimate" | "lttb";

  private constructor(
    baseClient: ChunkedTimeseriesClient,
    downsampleFactor: number,
    downsampleMethod: "decimate" | "lttb" = "lttb",
  ) {
    this.baseClient = baseClient;
    this.downsampleFactor = downsampleFactor;
    this.downsampleMethod = downsampleMethod;
  }

  static async create(
    nwbUrl: string,
    group: Hdf5Group,
    options: {
      downsampleFactor: number;
      downsampleMethod?: "decimate" | "lttb";
      chunkSizeSec?: number;
      chunkSizeNumChannels?: number;
    },
  ): Promise<DownsampledChunkedTimeseriesClient> {
    const {
      downsampleFactor,
      downsampleMethod = "lttb",
      ...chunkOptions
    } = options;
    const baseClient = await ChunkedTimeseriesClient.create(
      nwbUrl,
      group,
      chunkOptions,
    );
    return new DownsampledChunkedTimeseriesClient(
      baseClient,
      downsampleFactor,
      downsampleMethod,
    );
  }

  private downsampleDecimate(
    timestamps: number[],
    data: number[][],
    factor: number,
  ): { timestamps: number[]; data: number[][] } {
    if (factor <= 1) {
      return { timestamps, data };
    }

    const decimatedTimestamps = timestamps.filter((_, i) => i % factor === 0);
    const decimatedData = data.map((channel) =>
      channel.filter((_, i) => i % factor === 0),
    );

    return {
      timestamps: decimatedTimestamps,
      data: decimatedData,
    };
  }

  private downsampleLTTB(
    timestamps: number[],
    data: number[][],
    factor: number,
  ): { timestamps: number[]; data: number[][] } {
    if (factor <= 1) {
      return { timestamps, data };
    }

    const targetPoints = Math.ceil(timestamps.length / factor);
    if (targetPoints >= timestamps.length) {
      return { timestamps, data };
    }

    const downsampledData: number[][] = [];
    let downsampledTimestamps: number[] = [];

    // Process each channel independently
    for (let channelIndex = 0; channelIndex < data.length; channelIndex++) {
      const channelData = data[channelIndex];

      // Convert to [x, y] format required by LTTB
      const xyData: [number, number][] = timestamps.map((t, i) => [
        t,
        channelData[i],
      ]);

      // Apply LTTB downsampling
      const downsampled = LTTB(xyData, targetPoints) as [number, number][];

      // Extract data for this channel
      downsampledData.push(
        downsampled.map((point: [number, number]) => point[1]),
      );

      // Use timestamps from first channel (all channels should have same timestamps)
      if (channelIndex === 0) {
        downsampledTimestamps = downsampled.map(
          (point: [number, number]) => point[0],
        );
      }
    }

    return {
      timestamps: downsampledTimestamps,
      data: downsampledData,
    };
  }

  async getDataForTimeRange(
    tStart: number,
    tEnd: number,
    channelStart: number,
    channelEnd: number,
  ) {
    // Get data from base client
    const originalData = await this.baseClient.getDataForTimeRange(
      tStart,
      tEnd,
      channelStart,
      channelEnd,
    );

    // Apply selected downsampling method
    return this.applyDownsampling(
      originalData.timestamps,
      originalData.data,
      this.downsampleMethod,
      this.downsampleFactor,
    );
  }

  private applyDownsampling(
    timestamps: number[],
    data: number[][],
    method: "decimate" | "lttb",
    factor: number,
  ): { timestamps: number[]; data: number[][] } {
    switch (method) {
      case "lttb":
        return this.downsampleLTTB(timestamps, data, factor);
      case "decimate":
      default:
        return this.downsampleDecimate(timestamps, data, factor);
    }
  }

  get startTime(): number {
    return this.baseClient.startTime;
  }

  get endTime(): number {
    return this.baseClient.endTime;
  }

  get duration(): number {
    return this.baseClient.duration;
  }

  get samplingFrequency(): number {
    return this.baseClient.samplingFrequency / this.downsampleFactor;
  }

  get numChannels(): number {
    return this.baseClient.numChannels;
  }

  get numSamples(): number {
    return Math.floor(this.baseClient.numSamples / this.downsampleFactor);
  }

  get chunkSizeSec(): number {
    return this.baseClient.chunkSizeSec;
  }

  isLabeledEvents(): boolean {
    return this.baseClient.isLabeledEvents();
  }

  getLabels(): string[] | undefined {
    return this.baseClient.getLabels();
  }
}
