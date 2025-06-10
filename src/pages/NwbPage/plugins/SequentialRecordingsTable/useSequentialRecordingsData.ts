import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";
import { useEffect, useState } from "react";
import { ChunkedTimeseriesClient } from "../simple-timeseries/TimeseriesClient";
import {
  SequentialRecordingsData,
  SequentialRecordingsPair,
  TimeRange,
  TimeseriesDataWithUnits,
} from "./types";

export const useSequentialRecordingsData = (
  nwbUrl: string,
  path: string,
  timeRange?: TimeRange,
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
        setData((prev) => ({ ...prev, isLoading: true, error: undefined }));

        // Step 1: Load stimulus types from sequential recordings
        const stimulusTypesData = await getHdf5DatasetData(
          nwbUrl,
          `${path}/stimulus_type`,
          {},
        );
        if (!stimulusTypesData) {
          throw new Error("Could not load stimulus types");
        }

        // Step 2: Load simultaneous recordings indices
        const simultaneousRecordingsData = await getHdf5DatasetData(
          nwbUrl,
          `${path}/simultaneous_recordings`,
          {},
        );
        const simultaneousRecordingsIndex = await getHdf5DatasetData(
          nwbUrl,
          `${path}/simultaneous_recordings_index`,
          {},
        );

        if (!simultaneousRecordingsData || !simultaneousRecordingsIndex) {
          throw new Error("Could not load simultaneous recordings data");
        }

        // Step 3: Load recordings from simultaneous_recordings table
        const recordingsData = await getHdf5DatasetData(
          nwbUrl,
          "/general/intracellular_ephys/simultaneous_recordings/recordings",
          {},
        );
        const recordingsIndex = await getHdf5DatasetData(
          nwbUrl,
          "/general/intracellular_ephys/simultaneous_recordings/recordings_index",
          {},
        );

        if (!recordingsData || !recordingsIndex) {
          throw new Error("Could not load recordings data");
        }

        // Step 4: Load stimulus and response references
        const stimulusRefs = await getHdf5DatasetData(
          nwbUrl,
          "/general/intracellular_ephys/intracellular_recordings/stimuli/stimulus",
          {},
        );
        const responseRefs = await getHdf5DatasetData(
          nwbUrl,
          "/general/intracellular_ephys/intracellular_recordings/responses/response",
          {},
        );

        if (!stimulusRefs || !responseRefs) {
          throw new Error("Could not load stimulus/response references");
        }

        if (cancelled) return;

        // Step 5: Process the data structure
        const pairs: SequentialRecordingsPair[] = [];
        const stimulusTypesSet = new Set<string>();
        let pairId = 0;

        // Convert data to arrays if needed
        const stimulusTypesArray = Array.isArray(stimulusTypesData)
          ? stimulusTypesData
          : Array.from(stimulusTypesData as any);
        const simultaneousRecordingsArray = Array.isArray(
          simultaneousRecordingsData,
        )
          ? simultaneousRecordingsData
          : Array.from(simultaneousRecordingsData as any);
        const simultaneousRecordingsIndexArray = Array.isArray(
          simultaneousRecordingsIndex,
        )
          ? simultaneousRecordingsIndex
          : Array.from(simultaneousRecordingsIndex as any);
        const recordingsArray = Array.isArray(recordingsData)
          ? recordingsData
          : Array.from(recordingsData as any);
        const recordingsIndexArray = Array.isArray(recordingsIndex)
          ? recordingsIndex
          : Array.from(recordingsIndex as any);

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

          // Get simultaneous recordings for this sequential recording
          const simRecordings = getRaggedSlice(
            simultaneousRecordingsArray,
            simultaneousRecordingsIndexArray,
            seqRow,
          );

          // For each simultaneous recording
          for (const simRow of simRecordings) {
            // Get individual recordings for this simultaneous recording
            const recordings = getRaggedSlice(
              recordingsArray,
              recordingsIndexArray,
              simRow,
            );

            // For each individual recording
            for (const recId of recordings) {
              if (cancelled) return;

              try {
                // Get stimulus and response references
                const stimRef = (stimulusRefs as any)[recId];
                const respRef = (responseRefs as any)[recId];

                if (!stimRef || !respRef) {
                  continue;
                }

                // Extract timeseries paths from compound dataset references
                // The refs are arrays with [idx_start, count, timeseries_object_ref]
                let stimulusPath: string;
                let responsePath: string;

                if (Array.isArray(stimRef) && stimRef.length >= 3) {
                  const stimTimeseriesRef = stimRef[2];

                  // Try to decode the Uint8Array object reference
                  if (stimTimeseriesRef instanceof Uint8Array) {
                    // Construct the stimulus path based on the recording ID
                    // Recording ID 3 maps to stimulus-04-ch-0 (ID + 1)
                    stimulusPath = `/stimulus/presentation/stimulus-${String(recId + 1).padStart(2, "0")}-ch-0`;
                  } else {
                    stimulusPath = String(stimTimeseriesRef);
                  }
                } else {
                  console.warn(
                    `Unexpected stimulus ref structure for ${recId}:`,
                    stimRef,
                  );
                  continue;
                }

                if (Array.isArray(respRef) && respRef.length >= 3) {
                  const respTimeseriesRef = respRef[2];

                  // Try to decode the Uint8Array object reference
                  if (respTimeseriesRef instanceof Uint8Array) {
                    // Construct the response path based on the recording ID
                    // Recording ID 3 maps to current_clamp-response-04-ch-0 (ID + 1)
                    responsePath = `/acquisition/current_clamp-response-${String(recId + 1).padStart(2, "0")}-ch-0`;
                  } else {
                    responsePath = String(respTimeseriesRef);
                  }
                } else {
                  console.warn(
                    `Unexpected response ref structure for ${recId}:`,
                    respRef,
                  );
                  continue;
                }

                // Load timeseries data for stimulus and response
                const [stimulusData, responseData] = await Promise.all([
                  loadTimeseriesData(nwbUrl, stimulusPath, timeRange),
                  loadTimeseriesData(nwbUrl, responsePath, timeRange),
                ]);

                if (stimulusData && responseData) {
                  pairs.push({
                    pairId,
                    stimulusType,
                    stimulusPath,
                    responsePath,
                    stimulusData,
                    responseData,
                  });
                  pairId++;
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
        setData((prev) => ({
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
  timeRange?: TimeRange,
): Promise<TimeseriesDataWithUnits | null> => {
  try {
    // Get the group for this timeseries
    const group = await getHdf5Group(nwbUrl, timeseriesPath);
    if (!group) return null;

    // Extract unit information from the data dataset attributes
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    const unit = dataDataset?.attrs?.unit || "unknown";

    // Extract time unit from timestamps dataset if available
    const timestampsDataset = group.datasets.find(
      (ds) => ds.name === "timestamps",
    );
    const timeUnit = timestampsDataset?.attrs?.unit || "seconds";

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
      unit: String(unit),
      timeUnit: String(timeUnit),
    };
  } catch (error) {
    console.warn(
      `Failed to load timeseries data from ${timeseriesPath}:`,
      error,
    );
    return null;
  }
};
