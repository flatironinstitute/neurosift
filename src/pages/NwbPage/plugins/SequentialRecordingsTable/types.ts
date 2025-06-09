export interface TimeseriesDataWithUnits {
    timestamps: number[];
    data: number[];
    unit: string;
    timeUnit?: string;
}

export interface SequentialRecordingsPair {
    pairId: number;
    stimulusType: string;
    stimulusPath: string;
    responsePath: string;
    stimulusData: TimeseriesDataWithUnits;
    responseData: TimeseriesDataWithUnits;
}

export interface SequentialRecordingsData {
    pairs: SequentialRecordingsPair[];
    stimulusTypes: string[];
    isLoading: boolean;
    error?: string;
}

export interface TimeRange {
    start: number;
    duration: number;
}
