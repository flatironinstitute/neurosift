import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";
import { useEffect, useState } from "react";
import { ChunkedTimeseriesClient } from "../simple-timeseries/TimeseriesClient";
import { SequentialRecordingsData, SequentialRecordingsPair, TimeRange } from "./types";

export const useSequentialRecordingsData = (
    nwbUrl: string,
    path: string,
    timeRange?: TimeRange
): SequentialRecordingsData => {
    const [data, setData] = useState<SequentialRecordingsData>({
        pairs: [],
        stimulusTypes: [],
        isLoading: true,
        error: undefined,
    });

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            try {
                setData(prev => ({ ...prev, isLoading: true, error: undefined }));

                // Step 1: Load stimulus types from sequential recordings
                const stimulusTypesData = await getHdf5DatasetData(
                    nwbUrl,
                    `${path}/stimulus_type`,
                    {}
                );
                if (!stimulusTypesData) {
                    throw new Error("Could not load stimulus types");
                }

                // Step 2: Load simultaneous recordings indices
                const simultaneousRecordingsData = await getHdf5DatasetData(
                    nwbUrl,
                    `${path}/simultaneous_recordings`,
                    {}
                );
                const simultaneousRecordingsIndex = await getHdf5DatasetData(
                    nwbUrl,
                    `${path}/simultaneous_recordings_index`,
                    {}
                );

                if (!simultaneousRecordingsData || !simultaneousRecordingsIndex) {
                    throw new Error("Could not load simultaneous recordings data");
                }

                // Step 3: Load recordings from simultaneous_recordings table
                const recordingsData = await getHdf5DatasetData(
                    nwbUrl,
                    "/general/intracellular_ephys/simultaneous_recordings/recordings",
                    {}
                );
                const recordingsIndex = await getHdf5DatasetData(
                    nwbUrl,
                    "/general/intracellular_ephys/simultaneous_recordings/recordings_index",
                    {}
                );

                if (!recordingsData || !recordingsIndex) {
                    throw new Error("Could not load recordings data");
                }

                // Step 4: Load stimulus and response references
                const stimulusRefs = await getHdf5DatasetData(
                    nwbUrl,
                    "/general/intracellular_ephys/intracellular_recordings/stimuli/stimulus",
                    {}
                );
                const responseRefs = await getHdf5DatasetData(
                    nwbUrl,
                    "/general/intracellular_ephys/intracellular_recordings/responses/response",
                    {}
                );

                if (!stimulusRefs || !responseRefs) {
                    throw new Error("Could not load stimulus/response references");
                }

                if (cancelled) return;

                // Debug: Log the structure of the references
                console.log("Stimulus refs structure:", stimulusRefs);
                console.log("Response refs structure:", responseRefs);
                console.log("First response ref:", (responseRefs as any)[0]);


                // Step 5: Process the data structure
                const pairs: SequentialRecordingsPair[] = [];
                const stimulusTypesSet = new Set<string>();
                let pairId = 0;

                // Convert data to arrays if needed
                const stimulusTypesArray = Array.isArray(stimulusTypesData)
                    ? stimulusTypesData
                    : Array.from(stimulusTypesData as any);
                const simultaneousRecordingsArray = Array.isArray(simultaneousRecordingsData)
                    ? simultaneousRecordingsData
                    : Array.from(simultaneousRecordingsData as any);
                const simultaneousRecordingsIndexArray = Array.isArray(simultaneousRecordingsIndex)
                    ? simultaneousRecordingsIndex
                    : Array.from(simultaneousRecordingsIndex as any);
                const recordingsArray = Array.isArray(recordingsData)
                    ? recordingsData
                    : Array.from(recordingsData as any);
                const recordingsIndexArray = Array.isArray(recordingsIndex)
                    ? recordingsIndex
                    : Array.from(recordingsIndex as any);

                // Debug: Log the arrays
                console.log("Stimulus types:", stimulusTypesArray);
                console.log("Simultaneous recordings:", simultaneousRecordingsArray);
                console.log("Recordings:", recordingsArray);

                // Helper function to get ragged array slice
                const getRaggedSlice = (array: any[], index: any[], row: number) => {
                    const start = row === 0 ? 0 : index[row - 1];
                    const end = index[row];
                    return array.slice(start, end);
                };

                // Iterate through sequential recordings
                for (let seqRow = 0; seqRow < stimulusTypesArray.length; seqRow++) {
                    const stimulusType = String(stimulusTypesArray[seqRow]);
                    stimulusTypesSet.add(stimulusType);

                    console.log(`Processing stimulus type: ${stimulusType} (row ${seqRow})`);

                    // Get simultaneous recordings for this sequential recording
                    const simRecordings = getRaggedSlice(
                        simultaneousRecordingsArray,
                        simultaneousRecordingsIndexArray,
                        seqRow
                    );

                    console.log(`Simultaneous recordings for ${stimulusType}:`, simRecordings);

                    // For each simultaneous recording
                    for (const simRow of simRecordings) {
                        // Get individual recordings for this simultaneous recording
                        const recordings = getRaggedSlice(recordingsArray, recordingsIndexArray, simRow);

                        console.log(`Individual recordings for simRow ${simRow}:`, recordings);

                        // For each individual recording
                        for (const recId of recordings) {
                            if (cancelled) return;

                            try {
                                console.log(`Processing recording ID: ${recId}`);

                                // Get stimulus and response references
                                const stimRef = (stimulusRefs as any)[recId];
                                const respRef = (responseRefs as any)[recId];

                                console.log(`Stim ref for ${recId}:`, stimRef);
                                console.log(`Resp ref for ${recId}:`, respRef);

                                if (!stimRef || !respRef) {
                                    console.log(`Missing refs for recording ${recId}`);
                                    continue;
                                }

                                // Extract timeseries paths from compound dataset references
                                // The refs are arrays with [idx_start, count, timeseries_object_ref]
                                let stimulusPath: string;
                                let responsePath: string;

                                if (Array.isArray(stimRef) && stimRef.length >= 3) {
                                    const stimTimeseriesRef = stimRef[2];
                                    console.log(`Stim timeseries ref for ${recId}:`, stimTimeseriesRef);

                                    // Try to decode the Uint8Array object reference
                                    if (stimTimeseriesRef instanceof Uint8Array) {
                                        // Try different decoding approaches
                                        const asString = new TextDecoder().decode(stimTimeseriesRef);
                                        const asHex = Array.from(stimTimeseriesRef).map(b => b.toString(16).padStart(2, '0')).join('');
                                        console.log(`Stim ref as string: "${asString}"`);
                                        console.log(`Stim ref as hex: ${asHex}`);

                                        // Construct the stimulus path based on the recording ID
                                        // Recording ID 3 maps to stimulus-04-ch-0 (ID + 1)
                                        stimulusPath = `/stimulus/presentation/stimulus-${String(recId + 1).padStart(2, '0')}-ch-0`;
                                    } else {
                                        stimulusPath = String(stimTimeseriesRef);
                                    }
                                } else {
                                    console.warn(`Unexpected stimulus ref structure for ${recId}:`, stimRef);
                                    continue;
                                }

                                if (Array.isArray(respRef) && respRef.length >= 3) {
                                    const respTimeseriesRef = respRef[2];
                                    console.log(`Resp timeseries ref for ${recId}:`, respTimeseriesRef);

                                    // Try to decode the Uint8Array object reference
                                    if (respTimeseriesRef instanceof Uint8Array) {
                                        // Try different decoding approaches
                                        const asString = new TextDecoder().decode(respTimeseriesRef);
                                        const asHex = Array.from(respTimeseriesRef).map(b => b.toString(16).padStart(2, '0')).join('');
                                        console.log(`Resp ref as string: "${asString}"`);
                                        console.log(`Resp ref as hex: ${asHex}`);

                                        // Construct the response path based on the recording ID
                                        // Recording ID 3 maps to current_clamp-response-04-ch-0 (ID + 1)
                                        responsePath = `/acquisition/current_clamp-response-${String(recId + 1).padStart(2, '0')}-ch-0`;
                                    } else {
                                        responsePath = String(respTimeseriesRef);
                                    }
                                } else {
                                    console.warn(`Unexpected response ref structure for ${recId}:`, respRef);
                                    continue;
                                }

                                console.log(`Paths for ${recId}: stim=${stimulusPath}, resp=${responsePath}`);

                                // Load timeseries data for stimulus and response
                                const [stimulusData, responseData] = await Promise.all([
                                    loadTimeseriesData(nwbUrl, stimulusPath, timeRange),
                                    loadTimeseriesData(nwbUrl, responsePath, timeRange),
                                ]);

                                if (stimulusData && responseData) {
                                    console.log(`Successfully loaded pair ${pairId} for ${stimulusType}`);
                                    pairs.push({
                                        pairId,
                                        stimulusType,
                                        stimulusPath,
                                        responsePath,
                                        stimulusData,
                                        responseData,
                                    });
                                    pairId++;
                                } else {
                                    console.log(`Failed to load timeseries data for ${recId}`);
                                }
                            } catch (error) {
                                console.warn(`Failed to load pair ${pairId}:`, error);
                                // Continue with next recording
                            }
                        }
                    }
                }

                if (cancelled) return;

                setData({
                    pairs,
                    stimulusTypes: Array.from(stimulusTypesSet).sort(),
                    isLoading: false,
                    error: undefined,
                });
            } catch (error) {
                if (cancelled) return;
                console.error("Error loading sequential recordings data:", error);
                setData(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                }));
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [nwbUrl, path, timeRange]);

    return data;
};

// Helper function to load timeseries data from a path
const loadTimeseriesData = async (
    nwbUrl: string,
    timeseriesPath: string,
    timeRange?: TimeRange
): Promise<{ timestamps: number[]; data: number[] } | null> => {
    try {
        // Get the group for this timeseries
        const group = await getHdf5Group(nwbUrl, timeseriesPath);
        if (!group) return null;

        // Create a timeseries client
        const client = await ChunkedTimeseriesClient.create(nwbUrl, group, {
            chunkSizeSec: 1,
        });

        // Determine time range to load
        const startTime = timeRange?.start ?? client.startTime;
        const endTime = timeRange
            ? timeRange.start + timeRange.duration
            : Math.min(client.startTime + 10, client.endTime); // Default to first 10 seconds

        // Load data for first channel only (most intracellular recordings are single channel)
        const result = await client.getDataForTimeRange(startTime, endTime, 0, 1);

        return {
            timestamps: result.timestamps,
            data: result.data[0] || [], // First channel
        };
    } catch (error) {
        console.warn(`Failed to load timeseries data from ${timeseriesPath}:`, error);
        return null;
    }
};
