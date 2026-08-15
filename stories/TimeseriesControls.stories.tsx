import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CondensedControls,
  Controls,
} from "../src/pages/NwbPage/plugins/simple-timeseries/Controls";
import type { SimpleTimeseriesInfo } from "../src/pages/NwbPage/plugins/simple-timeseries/types";
import { Frame } from "./utils";

/**
 * The control strip that sits above a timeseries plot: the channel window
 * (which channels are shown and how far apart), and the time window (pan and
 * zoom). The plot canvas itself is deliberately not part of this story — it is
 * painted by a web worker into an OffscreenCanvas, which does not survive being
 * re-rendered from an archived DOM, so it would make an unreliable baseline.
 * These controls are plain DOM driven entirely by props.
 */

const info: SimpleTimeseriesInfo = {
  visibleDuration: 5,
  startTimestamp: 0,
  totalNumSamples: 900_000,
  totalNumChannels: 64,
  samplingFrequency: 30_000,
  timeseriesStartTime: 0,
  timeseriesDuration: 30,
};

const noop = () => {};

const handlers = {
  onDecreaseChannels: noop,
  onIncreaseChannels: noop,
  onShiftChannelsLeft: noop,
  onShiftChannelsRight: noop,
  onDecreaseVisibleDuration: noop,
  onIncreaseVisibleDuration: noop,
  onShiftTimeLeft: noop,
  onShiftTimeRight: noop,
  onDecreaseChannelSeparation: noop,
  onIncreaseChannelSeparation: noop,
};

const meta = {
  title: "Timeseries/Controls",
  component: Controls,
  // TimeRangeControls reaches for the timeseries selection context, so every
  // story is wrapped in the same provider the NWB views use.
  decorators: [
    (Story) => (
      <ProvideTimeseriesSelection>
        <Frame width={900} height={120}>
          <Story />
        </Frame>
      </ProvideTimeseriesSelection>
    ),
  ],
  args: {
    info,
    visibleChannelsStart: 0,
    numVisibleChannels: 8,
    visibleTimeStart: 0,
    visibleDuration: 5,
    channelSeparation: 1,
    ...handlers,
  },
} satisfies Meta<typeof Controls>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The full-width layout, as used when the view has room for one row. */
export const Full: Story = {};

/** Scrolled into the middle of a 64-channel recording, zoomed in to 0.5 s. */
export const ZoomedIn: Story = {
  name: "Zoomed in, mid-recording",
  args: {
    visibleChannelsStart: 24,
    visibleTimeStart: 12.5,
    visibleDuration: 0.5,
    info: { ...info, visibleDuration: 0.5 },
  },
};

/** Channels spread apart — the separation control only appears above one channel. */
export const WideSeparation: Story = {
  name: "Wide channel separation",
  args: { channelSeparation: 5 },
};

/** A single-channel series hides the channel and separation controls entirely. */
export const SingleChannel: Story = {
  name: "Single channel",
  args: {
    info: { ...info, totalNumChannels: 1, samplingFrequency: 400 },
    numVisibleChannels: 1,
  },
};

/** The condensed layout, used when the view is too short for the full strip. */
export const Condensed: Story = {
  render: (args) => <CondensedControls {...args} />,
};

/** Condensed layout with only one channel visible, so separation is hidden. */
export const CondensedSingleVisibleChannel: Story = {
  name: "Condensed, one visible channel",
  args: { numVisibleChannels: 1 },
  render: (args) => <CondensedControls {...args} />,
};
