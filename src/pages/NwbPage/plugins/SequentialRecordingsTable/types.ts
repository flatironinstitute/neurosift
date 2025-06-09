export interface SequentialRecordingsPair {
    pairId: number;
    stimulusType: string;
    stimulusPath: string;
    responsePath: string;
    stimulusData: { timestamps: number[]; data: number[] };
    responseData: { timestamps: number[]; data: number[] };
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
