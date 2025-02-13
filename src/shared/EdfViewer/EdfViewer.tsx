import { Splitter } from "@fi-sci/splitter";
import { TimeseriesTimestampsClient } from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import EDFReader from "./EDFReader";
import {
  DatasetChunkingClientInterface,
  NwbTimeseriesViewChild,
} from "./TimeseriesItemView/NwbTimeseriesView";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";

type EdfPageProps = {
  edfUrl: string;
  width: number;
  height: number;
};

// small number of channels:
// https://neurosift.app/?p=/edf&url=%22https://s3.amazonaws.com/openneuro.org/ds003374/sub-01/ses-01/ieeg/sub-01_ses-01_task-jokeit_run-01_ieeg.edf?versionId=fmme9zou6CJaupJWGNfKx54PzDIruE1f%22

// 95 channels, with one not shown because it has a different sampling rate:
// https://neurosift.app/?p=/edf&url=%22https://s3.amazonaws.com/openneuro.org/ds005523/sub-R1032D/ses-0/ieeg/sub-R1032D_ses-0_task-YC2_acq-bipolar_ieeg.edf?versionId=456bC8NDUApR25BVpvdVrut7sur0Nk_o%22

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
  const timeseriesTimestampsClient =
    useTimeseriesTimestampsClientForEdfReader(edfReader);
  const datasetChunkingClient = useDatasetChunkingClientForEdfReader(
    edfReader,
    selectedChannelIndices,
    channelSeparation,
  );
  const yLabel = "";

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
  const initialLeftPanelPosition = width < 800 ? Math.min(200, width / 2) : 300;
  useEffect(() => {
    // select all the channels to start
    setSelectedChannelIndices(
      edfReader?.getSignalTextLabels().map((_, i) => i) || [],
    );
  }, [edfReader]);
  if (!edfReader) return <div>Loading EDF file...</div>;
  if (!timeseriesTimestampsClient)
    return <div>Loading timestamps client...</div>;
  if (!datasetChunkingClient) return <div>Loading chunking client...</div>;
  return (
    <Splitter
      width={width}
      height={height}
      direction="horizontal"
      initialPosition={initialLeftPanelPosition}
    >
      <LeftPanel
        width={0}
        height={0}
        edfReader={edfReader}
        selectedChannelIndices={selectedChannelIndices}
        setSelectedChannelIndices={setSelectedChannelIndices}
        edfUrl={edfUrl}
        channelSeparation={channelSeparation}
        setChannelSeparation={setChannelSeparation}
      />
      <NwbTimeseriesViewChild
        width={0}
        height={0}
        autoChannelSeparation={undefined}
        colorChannels={true}
        channelIndicesForColor={selectedChannelIndices}
        applyConversion={true}
        // spikeTrainsClient={undefined}
        startZoomedOut={undefined}
        timeseriesTimestampsClient={timeseriesTimestampsClient}
        datasetChunkingClient={datasetChunkingClient}
        numVisibleChannels={undefined}
        yLabel={yLabel}
        maxVisibleDuration={maxVisibleDuration}
      />
    </Splitter>
  );
};

type LeftPanelProps = {
  width: number;
  height: number;
  edfReader: EDFReader;
  selectedChannelIndices: number[];
  setSelectedChannelIndices: (indices: number[]) => void;
  edfUrl: string;
  channelSeparation: number;
  setChannelSeparation: (channelSeparation: number) => void;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  edfReader,
  selectedChannelIndices,
  setSelectedChannelIndices,
  edfUrl,
  channelSeparation,
  setChannelSeparation,
}) => {
  const openNeuroEDFInfo = useOpenNeuroInfo(edfUrl);
  return (
    <div
      style={{
        position: "relative",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
        overflowY: "auto",
      }}
    >
      <EDFChannelSelectionComponent
        width={width - 20}
        height={Math.max(200, height / 2)}
        edfReader={edfReader}
        selectedChannelIndices={selectedChannelIndices}
        setSelectedChannelIndices={setSelectedChannelIndices}
      />
      <hr />
      <ChannelSeparationSelector
        channelSeparation={channelSeparation}
        setChannelSeparation={setChannelSeparation}
      />
      <div>
        {openNeuroEDFInfo && (
          <div>
            <hr />
            <h4>OpenNeuro</h4>
            <table className="nwb-table">
              <tbody>
                <tr>
                  <td>Dataset</td>
                  <td>
                    <a
                      href={`https://openneuro.org/datasets/${openNeuroEDFInfo.datasetId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {openNeuroEDFInfo.datasetId}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Subject</td>
                  <td>{openNeuroEDFInfo.subjectId}</td>
                </tr>
                <tr>
                  <td>Session</td>
                  <td>{openNeuroEDFInfo.sessionId}</td>
                </tr>
                <tr>
                  <td>Modality</td>
                  <td>{openNeuroEDFInfo.modality}</td>
                </tr>
                <tr>
                  <td>File</td>
                  <td>{openNeuroEDFInfo.fileName}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

type ChannelSeparationSelectorProps = {
  channelSeparation: number;
  setChannelSeparation: (channelSeparation: number) => void;
};

const channelSeparationChoices = [0, 2, 5, 10, 20, 50, 100];

const ChannelSeparationSelector: FunctionComponent<
  ChannelSeparationSelectorProps
> = ({ channelSeparation, setChannelSeparation }) => {
  return (
    <div>
      Chan. sep (stdev)&nbsp;
      <select
        value={channelSeparation}
        onChange={(e) => setChannelSeparation(Number(e.target.value))}
      >
        {channelSeparationChoices.map((val) => (
          <option key={val} value={val}>
            {val}
          </option>
        ))}
      </select>
    </div>
  );
};

type EDFChannelSelectionComponentProps = {
  width: number;
  height: number;
  edfReader: EDFReader;
  selectedChannelIndices: number[];
  setSelectedChannelIndices: (indices: number[]) => void;
};

const EDFChannelSelectionComponent: FunctionComponent<
  EDFChannelSelectionComponentProps
> = ({
  width,
  height,
  edfReader,
  selectedChannelIndices,
  setSelectedChannelIndices,
}) => {
  const channelLabels = useMemo(() => {
    return edfReader.getSignalTextLabels();
  }, [edfReader]);

  const channelSamplingFrequencies = useMemo(() => {
    return edfReader.getSignalFreqs();
  }, [edfReader]);

  return (
    <div style={{ width, height, overflowY: "auto" }}>
      <table className="nwb-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedChannelIndices.length === channelLabels.length}
                onChange={() => {}}
                onClick={() => {
                  if (selectedChannelIndices.length === channelLabels.length) {
                    setSelectedChannelIndices([]);
                  } else {
                    setSelectedChannelIndices(channelLabels.map((_, i) => i));
                  }
                }}
              />
            </th>
            <th>Channel</th>
            <th>Rate (Hz)</th>
          </tr>
        </thead>
        <tbody>
          {channelLabels.map((label, i) => (
            <tr key={i}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedChannelIndices.includes(i)}
                  onChange={() => {}}
                  onClick={() => {
                    if (selectedChannelIndices.includes(i)) {
                      setSelectedChannelIndices(
                        selectedChannelIndices.filter((x) => x !== i),
                      );
                    } else {
                      setSelectedChannelIndices(
                        [...selectedChannelIndices, i].sort(),
                      );
                    }
                  }}
                />
              </td>
              <td>{label}</td>
              <td>{channelSamplingFrequencies[i] || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// const UnitSelectionComponent: FunctionComponent<
//   UnitsSelectionComponentProps
// > = ({
//   unitIds,
//   selectedUnitIds,
//   setSelectedUnitIds,
//   sortUnitsByVariable,
//   sortUnitsByValues,
// }) => {
//   if (!unitIds) return <div>Loading unit IDs...</div>;
//   return (
//     <table className="nwb-table">
//       <thead>
//         <tr>
//           <th>
//             <input
//               type="checkbox"
//               checked={
//                 (unitIds || []).length > 0 &&
//                 selectedUnitIds.length === (unitIds || []).length
//               }
//               onChange={() => {}}
//               onClick={() => {
//                 if (selectedUnitIds.length > 0) {
//                   setSelectedUnitIds([]);
//                 } else {
//                   setSelectedUnitIds(unitIds || []);
//                 }
//               }}
//             />
//           </th>
//           <th>Unit ID</th>
//           {sortUnitsByVariable && <th>{sortUnitsByVariable[0]}</th>}
//         </tr>
//       </thead>
//       <tbody>
//         {(unitIds || []).map((unitId) => (
//           <tr key={unitId}>
//             <td>
//               <input
//                 type="checkbox"
//                 checked={selectedUnitIds.includes(unitId)}
//                 onChange={() => {}}
//                 onClick={() => {
//                   if (selectedUnitIds.includes(unitId)) {
//                     setSelectedUnitIds(
//                       selectedUnitIds.filter((x) => x !== unitId),
//                     );
//                   } else {
//                     setSelectedUnitIds([...selectedUnitIds, unitId]);
//                   }
//                 }}
//               />
//             </td>
//             <td>{unitId}</td>
//             {sortUnitsByVariable && (
//               <td>{sortUnitsByValues ? sortUnitsByValues[unitId] : ""}</td>
//             )}
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// };

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
            break;
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
      const channelStdevs = concatenatedChunk.map((x) => {
        if (!x.length) return 0;
        const sum = x.reduce((a, b) => a + b, 0);
        const mean = sum / x.length;
        const sum2 = x.reduce((a, b) => a + (b - mean) ** 2, 0);
        return Math.sqrt(sum2 / x.length);
      });
      setEstimatedChannelStdevs(channelStdevs);
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

type OpenNeuroEDFInfo = {
  datasetId: string;
  subjectId: string;
  sessionId: string;
  modality: string;
  fileName: string;
};

const useOpenNeuroInfo = (url: string): OpenNeuroEDFInfo | null => {
  if (!url) return null;
  if (url.startsWith("https://s3.amazonaws.com/openneuro.org/")) {
    const parts = url.split("?")[0].split("/");
    if (parts.length === 9) {
      return {
        datasetId: parts[4],
        subjectId: parts[5],
        sessionId: parts[6],
        modality: parts[7],
        fileName: parts[8],
      };
    }
  }
  return null;
};

const computeMedian = (x: number[]) => {
  if (x.length === 0) return 0;
  const y = x.slice().sort((a, b) => a - b);
  if (y.length % 2 === 1) {
    return y[Math.floor(y.length / 2)];
  }
  return (y[y.length / 2 - 1] + y[y.length / 2]) / 2;
};

export default EdfViewer;
