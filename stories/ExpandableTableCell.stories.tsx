import ExpandableTableCell from "@components/ExpandableTableCell";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Centered } from "./utils";

const SHORT = "Mouse visual cortex, session 3";

const LONG =
  "Extracellular electrophysiology recordings from mouse primary visual " +
  "cortex during passive presentation of drifting gratings, with " +
  "simultaneous pupil tracking and running speed.";

const JSON_BLOB = JSON.stringify(
  {
    session_id: "sub-01_ses-3",
    electrode_group: "shankA",
    sampling_rate_hz: 30000,
  },
  null,
  2,
);

const meta = {
  title: "Components/ExpandableTableCell",
  component: ExpandableTableCell,
  decorators: [
    (Story) => (
      <Centered>
        <Story />
      </Centered>
    ),
  ],
} satisfies Meta<typeof ExpandableTableCell>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Content under `maxLength` renders verbatim, with no affordance to expand. */
export const ShortContent: Story = {
  name: "Short content",
  args: { content: SHORT },
};

/** The default state for long content: truncated, and clickable to expand. */
export const Truncated: Story = {
  args: { content: LONG },
};

/** A tighter `maxLength` truncates content that would otherwise fit. */
export const NarrowColumn: Story = {
  name: "Narrow column",
  args: { content: LONG, maxLength: 24 },
};

/** `preformatted` keeps whitespace, for JSON and other structured values. */
export const Preformatted: Story = {
  args: { content: JSON_BLOB, preformatted: true, maxLength: 500 },
};
