import { TabBar } from "@components/tabs/TabBar";
import type { BaseTab } from "@components/tabs/tabsReducer";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame } from "./utils";

const WIDTH = 900;

const openTabs: BaseTab[] = [
  { id: "units", label: "units", type: "neurodata-item" },
  { id: "trials", label: "trials", type: "neurodata-item" },
  {
    id: "acquisition/ElectricalSeries",
    label: "ElectricalSeries",
    type: "neurodata-item",
  },
];

const fixedTabs = [
  { id: "overview", label: "Overview", group: "left" },
  { id: "files", label: "Files", group: "left" },
  { id: "chat", label: "Chat", group: "right" },
];

const noop = () => {};

const meta = {
  title: "Components/TabBar",
  component: TabBar,
  decorators: [
    (Story) => (
      <Frame width={WIDTH} height={140}>
        <Story />
      </Frame>
    ),
  ],
  args: {
    width: WIDTH,
    onSwitchTab: noop,
    onCloseTab: noop,
    onFixedTabSwitch: noop,
  },
} satisfies Meta<typeof TabBar<BaseTab>>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Legacy single-row mode (used by DatasetWorkspace) with no tabs opened yet. */
export const MainOnly: Story = {
  name: "Main tab only",
  args: { tabs: [], activeTabId: "main" },
};

/** Single-row mode with several closable tabs; the third one is active. */
export const WithOpenTabs: Story = {
  name: "With open tabs",
  args: { tabs: openTabs, activeTabId: "acquisition/ElectricalSeries" },
};

/**
 * Two-row mode: pill-styled section tabs on top (grouped left/right by the
 * `group` field) and the closable object tabs underneath.
 */
export const FixedAndDynamic: Story = {
  name: "Fixed + dynamic rows",
  args: {
    tabs: openTabs,
    activeTabId: "trials",
    fixedTabs,
    fixedTabActiveId: "files",
  },
};

/** Two-row mode collapses to a single pill row when nothing is opened. */
export const FixedOnly: Story = {
  name: "Fixed rows only",
  args: {
    tabs: [],
    activeTabId: "main",
    fixedTabs,
    fixedTabActiveId: "overview",
  },
};
