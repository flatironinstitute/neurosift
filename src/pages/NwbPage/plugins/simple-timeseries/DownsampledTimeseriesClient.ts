import { Hdf5Group } from "@hdf5Interface";
import { ChunkedTimeseriesClient } from "./TimeseriesClient";

export class DownsampledChunkedTimeseriesClient {
    private baseClient: ChunkedTimeseriesClient;
    private downsampleFactor: number;

    private constructor(
        baseClient: ChunkedTimeseriesClient,
        downsampleFactor: number,
    ) {
        this.baseClient = baseClient;
        this.downsampleFactor = downsampleFactor;
    }

    static async create(
        nwbUrl: string,
        group: Hdf5Group,
        options: {
            downsampleFactor: number;
            chunkSizeSec?: number;
            chunkSizeNumChannels?: number;
        },
    ): Promise<DownsampledChunkedTimeseriesClient> {
        const { downsampleFactor, ...chunkOptions } = options;
        const baseClient = await ChunkedTimeseriesClient.create(nwbUrl, group, chunkOptions);
        return new DownsampledChunkedTimeseriesClient(baseClient, downsampleFactor);
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
        const decimatedData = data.map(channel =>
            channel.filter((_, i) => i % factor === 0)
        );

        return {
            timestamps: decimatedTimestamps,
            data: decimatedData
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

        // Apply decimation
        return this.downsampleDecimate(
            originalData.timestamps,
            originalData.data,
            this.downsampleFactor,
        );
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
