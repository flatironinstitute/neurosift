import { useCssVars } from "@components/useCssVars";
import { TimeseriesTimestampsClient } from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { AccordionItem, DescriptionList, LoadingState, Select } from "@ui";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import TimeView, {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
  TIME_VIEW_SETTINGS,
} from "../../pages/NwbPage/plugins/common/TimeView";
import { covers } from "../../pages/NwbPage/plugins/common/playback";
import { useWindowPlayback } from "../../pages/NwbPage/plugins/common/usePlayback";
import { useTimeWindow } from "../../pages/NwbPage/plugins/common/useTimeWindow";
import { timeseriesSummary } from "../../pages/NwbPage/plugins/simple-timeseries/timeseriesSummary";
import EDFReader from "./EDFReader";
import EdfChannels from "./EdfChannels";
import { channelStdev, computeMedian } from "./edfStats";
import { openNeuroInfo } from "./openNeuroInfo";
import {
  DatasetChunkingClientInterface,
  NwbTimeseriesViewChild,
} from "./TimeseriesItemView/NwbTimeseriesView";
import "./EdfViewer.css";

type EdfPageProps = {
  edfUrl: string;
  width: number;
  height: number;
};

// small number of channels:
// https://neurosift.app/?p=/edf&url=%22https://s3.amazonaws.com/openneuro.org/ds003374/sub-01/ses-01/ieeg/sub-01_ses-01_task-jokeit_run-01_ieeg.edf?versionId=fmme9zou6CJaupJWGNfKx54PzDIruE1f%22

// 95 channels, with one not shown because it has a different sampling rate:
// https://neurosift.app/?p=/edf&url=%22https://s3.amazonaws.com/openneuro.org/ds005523/sub-R1032D/ses-0/ieeg/sub-R1032D_ses-0_task-YC2_acq-bipolar_ieeg.edf?versionId=456bC8NDUApR25BVpvdVrut7sur0Nk_o%22

const channelSeparationChoices = [0, 2, 5, 10, 20, 50, 100];

/** An EDF recording: its signals on the shared time controls, with channels and the file's place on OpenNeuro beside. */
const EdfViewer: FunctionComponent<EdfPageProps> = ({
  edfUrl,
  width,
  height,
}) => {
  const { edfReader } = useEdfReader(edfUrl);
  const [selectedChannelIndices, setSelectedChannelIndices] = useState<
    number[]
  >([]);
  const [channelSeparation, setChannelSeparation] = useState<number>(0);
  const [open, setOpen] = useState({ channels: true, openNeuro: true });
  const timeseriesTimestampsClient =
    useTimeseriesTimestampsClientForEdfReader(edfReader);
  const datasetChunkingClient = useDatasetChunkingClientForEdfReader(
    edfReader,
    selectedChannelIndices,
    channelSeparation,
  );
  const sizeRef = useCssVars<HTMLDivElement>({
    "--edf-width": width,
    "--edf-height": height,
  });

  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  useEffect(() => {
    // todo: fix this
    initializeTimeseriesSelection({
      startTimeSec: 0,
      endTimeSec: 1,
    });
  }, [initializeTimeseriesSelection]);

  const maxVisibleDuration = useMemo(() => {
    const nChannels = edfReader?.getNSignals() || 1;
    const nSamplesPerSec = edfReader?.getSignalFreqs()[0] || 1;
    return 5e6 / (nSamplesPerSec * nChannels);
  }, [edfReader]);
  // Play shortens a window too long to draw, so it never plays the zoom-in message.
  const playback = useWindowPlayback(maxVisibleDuration);
  const lookahead = playback.playing
    ? 2 * Math.max(1, Number(playback.speed))
    : 0;
  const [loadedRange, setLoadedRange] = useState<
    { start: number; end: number } | undefined
  >();
  const time = useTimeWindow();
  useEffect(() => {
    // select all the channels to start
    setSelectedChannelIndices(
      edfReader?.getSignalTextLabels().map((_, i) => i) || [],
    );
  }, [edfReader]);

  const loading = !edfReader
    ? "Reading the EDF file"
    : !timeseriesTimestampsClient
      ? "Loading timestamps"
      : !datasetChunkingClient
        ? "Loading the channels"
        : undefined;

  const info = openNeuroInfo(edfUrl);
  const labels = edfReader?.getSignalTextLabels() ?? [];
  const rates = edfReader?.getSignalFreqs() ?? [];
  const visibleEnd = time.value.start + time.value.duration;
  const holding =
    time.value.duration <= maxVisibleDuration &&
    !covers(
      loadedRange,
      time.value.start,
      visibleEnd,
      timeseriesTimestampsClient?.endTime ?? visibleEnd,
    );
  const section = (key: keyof typeof open) => ({
    open: open[key],
    onToggle: (next: boolean) => setOpen((o) => ({ ...o, [key]: next })),
  });

  return (
    <div ref={sizeRef} className="edf-viewer">
      {loading || !timeseriesTimestampsClient || !datasetChunkingClient ? (
        <LoadingState label={loading ?? ""} phase="loading" />
      ) : (
        <TimeView
          label={info?.fileName ?? fileNameOf(edfUrl)}
          summary={timeseriesSummary({
            timeseriesStartTime: timeseriesTimestampsClient.startTime ?? 0,
            timeseriesDuration:
              (timeseriesTimestampsClient.endTime ?? 0) -
              (timeseriesTimestampsClient.startTime ?? 0),
            samplingFrequency: rates[0] ?? 0,
            totalNumChannels: labels.length,
          })}
          playback={playback}
          holding={holding}
          controls={
            <div className="edf-separation">
              <Select
                label="Separation"
                size="sm"
                value={String(channelSeparation)}
                onChange={(v) => setChannelSeparation(Number(v))}
                options={channelSeparationChoices.map((v) => ({
                  value: String(v),
                  label: `${v} σ`,
                }))}
              />
            </div>
          }
          settings={
            <>
              <AccordionItem
                title="Channels"
                summary={`${selectedChannelIndices.length} of ${labels.length}`}
                {...section("channels")}
              >
                <EdfChannels
                  labels={labels}
                  rates={rates}
                  selected={selectedChannelIndices}
                  onChange={setSelectedChannelIndices}
                />
              </AccordionItem>
              {info && (
                <AccordionItem
                  title="OpenNeuro"
                  summary={info.datasetId}
                  {...section("openNeuro")}
                >
                  <DescriptionList
                    label="OpenNeuro file"
                    items={[
                      {
                        term: "Dataset",
                        value: (
                          <a
                            href={`https://openneuro.org/datasets/${info.datasetId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {info.datasetId}
                          </a>
                        ),
                      },
                      { term: "Subject", value: info.subjectId },
                      { term: "Session", value: info.sessionId },
                      { term: "Modality", value: info.modality },
                      { term: "File", value: info.fileName, code: true },
                    ]}
                  />
                </AccordionItem>
              )}
            </>
          }
        >
          <NwbTimeseriesViewChild
            width={Math.max(240, width - TIME_VIEW_INSET - TIME_VIEW_SETTINGS)}
            height={Math.max(200, height - TIME_VIEW_CHROME - TIME_VIEW_INSET)}
            autoChannelSeparation={undefined}
            colorChannels={true}
            channelIndicesForColor={selectedChannelIndices}
            applyConversion={true}
            startZoomedOut={undefined}
            timeseriesTimestampsClient={timeseriesTimestampsClient}
            datasetChunkingClient={datasetChunkingClient}
            numVisibleChannels={undefined}
            yLabel=""
            maxVisibleDuration={maxVisibleDuration}
            lookahead={lookahead}
            onLoadedRange={setLoadedRange}
          />
        </TimeView>
      )}
    </div>
  );
};

const fileNameOf = (url: string) => url.split("?")[0].split("/").pop() || url;

const useEdfReader = (edfUrl: string) => {
  const [edfReader, setEdfReader] = useState<EDFReader | null>(null);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const reader = await EDFReader.fromURL(edfUrl);
      if (canceled) return;
      setEdfReader(reader);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [edfUrl]);
  return { edfReader };
};

const useTimeseriesTimestampsClientForEdfReader = (
  edfReader: EDFReader | null,
) => {
  const [timeseriesTimestampsClient, setTimeseriesTimestampsClient] =
    useState<TimeseriesTimestampsClient | null>(null);
  useEffect(() => {
    if (!edfReader) return;
    setTimeseriesTimestampsClient(null);
    if (edfReader.getNSignals() === 0) return;
    // the problem is that different signals can have different sample rates
    const sampleRateHz = edfReader.getSignalFreqs()[0];
    const nSamples = edfReader.getNSamples()[0];
    setTimeseriesTimestampsClient({
      startTime: 0,
      endTime: nSamples / sampleRateHz,
      estimatedSamplingFrequency: sampleRateHz,
      getDataIndexForTime: async (time: number) => {
        const i = Math.floor(time * sampleRateHz);
        return i;
      },
      getTimestampsForDataIndices: async (i1: number, i2: number) => {
        const timestamps: number[] = [];
        for (let i = i1; i < i2; i++) {
          timestamps.push(i / sampleRateHz);
        }
        // important to return a Float64Array so it can be compatible with Float64Array to handle large timestamps
        return new Float64Array(timestamps);
      },
    });
  }, [edfReader]);
  return timeseriesTimestampsClient;
};

const useDatasetChunkingClientForEdfReader = (
  edfReader: EDFReader | null,
  selectedChannelIndices: number[],
  channelSeparation: number,
) => {
  const [datasetChunkingClient, setDatasetChunkingClient] =
    useState<DatasetChunkingClientInterface | null>(null);
  useEffect(() => {
    if (!edfReader) return;
    setDatasetChunkingClient(null);
    if (edfReader.getNSignals() === 0) return;
    // const sampleRateHz = edfReader.getSignalFreqs()[0];
    const nSamples = edfReader.getNSamples()[0];
    const nChannels = edfReader.getNSignals();
    const chunkSize = 5000;
    const getConcatenatedChunk = async (
      startChunkIndex: number,
      endChunkIndex: number,
      canceler: { onCancel: (() => void)[] },
    ) => {
      let canceled = false;
      canceler.onCancel.push(() => {
        canceled = true;
      });
      const i1 = startChunkIndex * chunkSize;
      let i2 = endChunkIndex * chunkSize;
      if (i2 > nSamples) {
        i2 = nSamples;
      }
      // initializeWith NaNs
      const ret: number[][] = [];
      for (let i = 0; i < nChannels; i++) {
        ret.push(new Array(i2 - i1).fill(NaN));
      }
      const timer = Date.now();
      let incomplete = false;
      for (let iChunk = startChunkIndex; iChunk < endChunkIndex; iChunk++) {
        if (canceled)
          return {
            concatenatedChunk: [],
            completed: false,
          };
        const jj1 = iChunk * chunkSize;
        let jj2 = (iChunk + 1) * chunkSize;
        if (jj2 > nSamples) {
          jj2 = nSamples;
        }
        for (let iChannel = 0; iChannel < nChannels; iChannel++) {
          if (edfReader.getNSamples()[iChannel] !== nSamples) {
            // skip this channel because it has a different sampling rate than the first channel
            console.warn(
              "Skipping channel because it has a different sampling rate than the first channel: " +
                iChannel,
            );
            continue;
          }
          const xx = await edfReader.readSamples(iChannel, jj1, jj2);
          for (let j = 0; j < xx.length; j++) {
            ret[iChannel][jj1 - i1 + j] = xx[j];
          }
        }
        const elapsedSec = (Date.now() - timer) / 1000;
        if (elapsedSec > 2) {
          if (iChunk < endChunkIndex - 1) {
            incomplete = true;
          }
          break;
        }
      }
      return {
        concatenatedChunk: ret,
        completed: !incomplete,
      };
    };
    setDatasetChunkingClient({
      chunkSize,
      getConcatenatedChunk,
    });
  }, [edfReader]);
  const [estimatedChannelStdevs, setEstimatedChannelStdevs] = useState<
    number[]
  >([]);
  useEffect(() => {
    if (!datasetChunkingClient) return;
    (async () => {
      const initialChunk = await datasetChunkingClient.getConcatenatedChunk(
        0,
        1,
        { onCancel: [] },
      );
      const concatenatedChunk = initialChunk.concatenatedChunk;
      setEstimatedChannelStdevs(concatenatedChunk.map(channelStdev));
    })();
  }, [datasetChunkingClient]);
  const datasetChunkingClient2 = useMemo(() => {
    if (!datasetChunkingClient) return null;
    return {
      chunkSize: datasetChunkingClient.chunkSize,
      getConcatenatedChunk: async (
        startChunkIndex: number,
        endChunkIndex: number,
        canceler: { onCancel: (() => void)[] },
      ) => {
        if (!datasetChunkingClient) {
          throw Error("Unexpected: datasetChunkingClient is null");
        }
        const chunk = await datasetChunkingClient.getConcatenatedChunk(
          startChunkIndex,
          endChunkIndex,
          canceler,
        );
        // return only the selected channels
        const chunk2 = {
          concatenatedChunk: selectedChannelIndices.map(
            (i) => chunk.concatenatedChunk[i],
          ),
          completed: chunk.completed,
        };
        return chunk2;
      },
    };
  }, [datasetChunkingClient, selectedChannelIndices]);
  const absoluteChannelSeparation = useMemo(() => {
    if (!channelSeparation) return 0;
    if (!estimatedChannelStdevs.length) return 0;
    const medianStdev = computeMedian(
      selectedChannelIndices.map((i) => estimatedChannelStdevs[i]),
    );
    return channelSeparation * medianStdev;
  }, [channelSeparation, estimatedChannelStdevs, selectedChannelIndices]);
  const datasetChunkingClient3 = useMemo(() => {
    if (!datasetChunkingClient2) return null;
    if (!absoluteChannelSeparation) return datasetChunkingClient2;
    return {
      chunkSize: datasetChunkingClient2.chunkSize,
      getConcatenatedChunk: async (
        startChunkIndex: number,
        endChunkIndex: number,
        canceler: { onCancel: (() => void)[] },
      ) => {
        const chunk = await datasetChunkingClient2.getConcatenatedChunk(
          startChunkIndex,
          endChunkIndex,
          canceler,
        );
        // apply channel separation
        const concatenatedChunk = chunk.concatenatedChunk.map((x, aa) => {
          // caution: this is an in-place operation
          for (let i = 0; i < x.length; i++) {
            x[i] += aa * absoluteChannelSeparation;
          }
          return x;
        });
        return {
          concatenatedChunk,
          completed: chunk.completed,
        };
      },
    };
  }, [datasetChunkingClient2, absoluteChannelSeparation]);
  return datasetChunkingClient3;
};

export default EdfViewer;
