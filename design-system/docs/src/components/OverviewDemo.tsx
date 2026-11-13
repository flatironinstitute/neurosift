import { OverviewPanel } from "@ui";
import { useState } from "react";

const GROUPS = [
  {
    title: "Dandiset",
    items: [
      { term: "ID", value: "000673", code: true },
      { term: "Version", value: "0.250122.0110", code: true },
      {
        term: "Title",
        value:
          "Control of working memory by phase–amplitude coupling of human hippocampal neurons",
      },
    ],
  },
  {
    title: "Session",
    items: [
      { term: "Identifier", value: "sub-1_ses-1_P55CS", code: true },
      { term: "Start", value: "2018-01-01T00:00:00−08:00", code: true },
      { term: "Experimenter", value: "Kyzar, Michael" },
    ],
  },
  {
    title: "Keywords",
    items: [{ term: "Keywords", value: "single neuron, human, intracranial" }],
  },
];

/** The overview panel beside a stand-in workspace; drag or arrow the edge, or collapse it. */
export default function OverviewDemo() {
  const [width, setWidth] = useState(320);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="overview-demo">
      <OverviewPanel
        title="Overview"
        groups={GROUPS}
        width={width}
        onWidthChange={setWidth}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div className="overview-demo-workspace type-caption">Workspace</div>
    </div>
  );
}
