import { DatasetDataType } from "../../../../remote-h5-file";
import { getNwbDatasetData, NwbDataset, NwbGroup } from "../../nwbInterface";
import {
  IrregularTimeseriesTimestampsClient,
  RegularTimeseriesTimestampsClient,
} from "./TimeseriesTimestampsClient";

const isNumericTypedArray = (
  data: DatasetDataType | undefined,
): data is DatasetDataType => {
  return data !== undefined;
};

class TimeseriesClient {
  private constructor(
    private nwbUrl: string,
    private dataDataset: NwbDataset,
    private timestampsClient:
      | IrregularTimeseriesTimestampsClient
      | RegularTimeseriesTimestampsClient,
  ) {}

  static async create(
    nwbUrl: string,
    group: NwbGroup,
  ): Promise<TimeseriesClient> {
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) throw new Error("No data dataset found");

    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");

    const timestampsClient = hasTimestamps
      ? new IrregularTimeseriesTimestampsClient(nwbUrl, group.path)
      : new RegularTimeseriesTimestampsClient(nwbUrl, group.path);
    await timestampsClient.initialize();

    return new TimeseriesClient(nwbUrl, dataDataset, timestampsClient);
  }

  async startTime(): Promise<number> {
    return this.timestampsClient.startTime!;
  }

  async endTime(): Promise<number> {
    return this.timestampsClient.endTime!;
  }

  async duration(): Promise<number> {
    const [start, end] = await Promise.all([this.startTime(), this.endTime()]);
    return end - start;
  }

  async samplingFrequency(): Promise<number> {
    return this.timestampsClient.estimatedSamplingFrequency!;
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

  private async getDataForIndices(
    iStart: number,
    iEnd: number,
    channelStart: number,
    channelEnd: number,
  ) {
    const timestamps = await this.timestampsClient.getTimestampsForDataIndices(
      iStart,
      iEnd,
    );
    const data = await getNwbDatasetData(this.nwbUrl, this.dataDataset.path, {
      slice: [
        [iStart, iEnd],
        [channelStart, channelEnd],
      ],
    });
    if (!isNumericTypedArray(data)) throw new Error("Invalid data");
    if (!data) throw new Error("Unable to get data");
    if (!timestamps) throw new Error("Unable to get timestamps");
    return {
      data: Array.from(data),
      timestamps: Array.from(timestamps),
    };
  }

  async getDataForTimeRange(
    tStart: number,
    tEnd: number,
    channelStart: number,
    channelEnd: number,
  ) {
    const iStart = await this.timestampsClient.getDataIndexForTime(tStart);
    const iEnd = await this.timestampsClient.getDataIndexForTime(tEnd);
    return this.getDataForIndices(iStart, iEnd, channelStart, channelEnd);
  }

  async getDataForNumSamples(
    tStart: number,
    numSamples: number,
    channelStart: number,
    channelEnd: number,
  ) {
    const iStart = await this.timestampsClient.getDataIndexForTime(tStart);
    const iEnd = iStart + numSamples;
    return this.getDataForIndices(iStart, iEnd, channelStart, channelEnd);
  }
}

export default TimeseriesClient;
