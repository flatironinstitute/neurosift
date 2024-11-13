import { FunctionComponent } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { useDataset } from "../../misc/hooks";

type Props = {
  width: number;
  height: number;
  objectPath: string;
  timeSeriesViewOpts: TimeSeriesViewOpts;
  setTimeSeriesViewOpts: (opts: TimeSeriesViewOpts) => void;
};

export type TimeSeriesViewOpts = {
  numVisibleChannels: number;
  visibleStartChannel: number;
  autoChannelSeparation: number | undefined;
  colorChannels?: boolean;
  applyConversion?: boolean;
};

const TimeSeriesViewToolbar: FunctionComponent<Props> = ({
  width,
  height,
  objectPath,
  timeSeriesViewOpts,
  setTimeSeriesViewOpts,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");
  const dataDataset = useDataset(nwbFile, `${objectPath}/data`);
  const numChannels = dataDataset ? dataDataset.shape[1] : undefined;
  if (numChannels === undefined) return <span />;
  if (numChannels <= 1) return <span />;
  return (
    <div style={{ display: "flex" }}>
      <NumVisibleChannelsSelector
        totalNumChannels={numChannels}
        value={timeSeriesViewOpts.numVisibleChannels}
        setValue={(numVisibleChannels, visibleStartChannel) =>
          setTimeSeriesViewOpts({
            ...timeSeriesViewOpts,
            numVisibleChannels,
            visibleStartChannel,
          })
        }
        visibleStartChannel={timeSeriesViewOpts.visibleStartChannel}
      />
      &nbsp;&nbsp;&nbsp;&nbsp;
      <VisibleStartChannelSelector
        totalNumChannels={numChannels}
        value={timeSeriesViewOpts.visibleStartChannel}
        setValue={(visibleStartChannel) =>
          setTimeSeriesViewOpts({ ...timeSeriesViewOpts, visibleStartChannel })
        }
        numVisibleChannels={timeSeriesViewOpts.numVisibleChannels}
      />
      &nbsp;&nbsp;&nbsp;&nbsp;
      <AutoChannelSeparationSelector
        value={timeSeriesViewOpts.autoChannelSeparation}
        setValue={(autoChannelSeparation) =>
          setTimeSeriesViewOpts({
            ...timeSeriesViewOpts,
            autoChannelSeparation,
          })
        }
      />
      &nbsp;&nbsp;&nbsp;&nbsp;
      <ColorChannelsSelector
        value={timeSeriesViewOpts.colorChannels || false}
        setValue={(colorChannels) =>
          setTimeSeriesViewOpts({ ...timeSeriesViewOpts, colorChannels })
        }
      />
      &nbsp;&nbsp;&nbsp;&nbsp;
      <ApplyConversionSelector
        value={timeSeriesViewOpts.applyConversion || false}
        setValue={(applyConversion) =>
          setTimeSeriesViewOpts({ ...timeSeriesViewOpts, applyConversion })
        }
      />
    </div>
  );
};

type ColorChannelsSelectorProps = {
  value: boolean;
  setValue: (value: boolean) => void;
};

const ColorChannelsSelector: FunctionComponent<ColorChannelsSelectorProps> = ({
  value,
  setValue,
}) => {
  return (
    <div>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => setValue(e.target.checked)}
      />
      &nbsp;
      <span>Color channels</span>
    </div>
  );
};

type ApplyConversionSelectorProps = {
  value: boolean;
  setValue: (value: boolean) => void;
};

const ApplyConversionSelector: FunctionComponent<
  ApplyConversionSelectorProps
> = ({ value, setValue }) => {
  return (
    <div>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => setValue(e.target.checked)}
      />
      &nbsp;
      <span>Apply conversion</span>
    </div>
  );
};

type NumVisibleChannelsSelectorProps = {
  totalNumChannels?: number;
  value: number;
  setValue: (value: number, visibleStartChannel: number) => void;
  visibleStartChannel: number;
};

const NumVisibleChannelsSelector: FunctionComponent<
  NumVisibleChannelsSelectorProps
> = ({ totalNumChannels, value, setValue, visibleStartChannel }) => {
  const opts = [1, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 100].filter(
    (x) => !totalNumChannels || x <= totalNumChannels,
  );

  if (!totalNumChannels) return <span />;

  if (totalNumChannels <= 50 && !opts.includes(totalNumChannels)) {
    opts.push(totalNumChannels);
  }

  return (
    <div>
      <span># visible chans:</span>&nbsp;
      <select
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          let v2 = visibleStartChannel;
          if (v2 + v > totalNumChannels) {
            v2 = totalNumChannels - v;
          }
          setValue(v, v2);
        }}
      >
        {opts.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

type VisibleStartChannelSelectorProps = {
  totalNumChannels?: number;
  value: number;
  setValue: (value: number) => void;
  numVisibleChannels: number;
};

const VisibleStartChannelSelector: FunctionComponent<
  VisibleStartChannelSelectorProps
> = ({ totalNumChannels, value, setValue, numVisibleChannels }) => {
  if (!totalNumChannels) return <span />;

  const range = [value, value + numVisibleChannels - 1];

  const snap = (x: number) => {
    if (x > totalNumChannels - numVisibleChannels)
      return totalNumChannels - numVisibleChannels;
    if (x < 0) return 0;
    return Math.floor(x / numVisibleChannels) * numVisibleChannels;
  };

  const upArrow = (
    <span>
      <button
        disabled={range[0] <= 0}
        onClick={() => setValue(snap(value - numVisibleChannels))}
      >
        &#x25B2;
      </button>
    </span>
  );
  const downArrow = (
    <span>
      <button
        disabled={range[1] >= totalNumChannels - 1}
        onClick={() => setValue(snap(value + numVisibleChannels))}
      >
        &#x25BC;
      </button>
    </span>
  );

  return (
    <div>
      {upArrow}
      {downArrow}
      &nbsp; Viewing chans: &nbsp;
      {range[0] + 1} - {range[1] + 1}
      &nbsp; / {totalNumChannels}
    </div>
  );
};

type AutoChannelSeparationSelectorProps = {
  value: number | undefined;
  setValue: (value: number | undefined) => void;
};

const AutoChannelSeparationSelector: FunctionComponent<
  AutoChannelSeparationSelectorProps
> = ({ value, setValue }) => {
  const opts = [0.1, 0.2, 0.5, 1, 2, 4, 8];
  return (
    <div>
      <span>Chan. separation (a.u.):</span>&nbsp;
      <select
        value={value || ""}
        onChange={(e) => {
          const val = Number(e.target.value);
          setValue(val || undefined);
        }}
      >
        <option value={""}>None</option>
        {opts.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeSeriesViewToolbar;
