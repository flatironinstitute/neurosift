import { ObjectRow, SelectionBar, SelectionList } from "@ui";
import { useState } from "react";

// Objects from sub-1_ses-1 in Dandiset 000673.
const OBJECTS = [
  {
    path: "/acquisition/LFPs",
    name: "LFPs",
    type: "ElectricalSeries",
    description:
      "These are LFP recordings that have spike potentials removed and is downsampled to 400Hz",
    views: ["Timeseries", "Spectrogram"],
  },
  {
    path: "/intervals/trials",
    name: "trials",
    type: "TimeIntervals",
    description: "Intervals for the Sternberg task",
    views: ["Time intervals"],
  },
  {
    path: "/units",
    name: "units",
    type: "Units",
    description: "Sorted single units",
    views: ["Raster", "PSTH"],
  },
];
const DEVICE = {
  path: "/general/devices/Neuralynx-ATLAS",
  name: "Neuralynx-ATLAS",
  type: "Device",
  description: "Recording system",
};

/** The Main tab’s tree: check objects or views to open them together. */
export default function ObjectTreeDemo() {
  const [checked, setChecked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [listShown, setListShown] = useState(false);
  const toggle = (key: string) => (on: boolean) =>
    setChecked((keys) => (on ? [...keys, key] : keys.filter((k) => k !== key)));
  const label = (key: string) => key.split("/").pop()!.replace("#", ", ");
  return (
    <div className="object-tree-demo">
      {checked.length > 0 && (
        <SelectionBar
          names={checked.map(label)}
          onShowList={() => setListShown((s) => !s)}
          onClear={() => setChecked([])}
          onViewTogether={() => {}}
        />
      )}
      {listShown && checked.length > 2 && (
        <SelectionList
          items={checked.map((key) => ({
            id: key,
            label: label(key),
            context: key.split("#")[0],
          }))}
          onRemove={(id) => setChecked((keys) => keys.filter((k) => k !== id))}
        />
      )}
      <ul className="object-tree-demo-list" aria-label="Objects in sub-1_ses-1">
        {OBJECTS.map((object) => (
          <ObjectRow
            key={object.path}
            {...object}
            level={1}
            kind="leaf"
            onToggle={() => {}}
            checked={checked.includes(object.path)}
            onCheck={toggle(object.path)}
            onOpen={() => {}}
            views={object.views.map((view) => ({
              name: view,
              checked: checked.includes(`${object.path}#${view}`),
              onCheck: toggle(`${object.path}#${view}`),
              onOpen: () => {},
            }))}
          />
        ))}
        <ObjectRow
          name="general"
          path="/general"
          type=""
          level={1}
          kind={open ? "expanded" : "collapsed"}
          onToggle={() => setOpen((o) => !o)}
          checked={false}
          onCheck={() => {}}
          onOpen={() => setOpen((o) => !o)}
          views={[]}
        >
          <ObjectRow
            {...DEVICE}
            level={2}
            kind="leaf"
            onToggle={() => {}}
            checked={checked.includes(DEVICE.path)}
            onCheck={toggle(DEVICE.path)}
            onOpen={() => {}}
            views={[]}
          />
        </ObjectRow>
      </ul>
    </div>
  );
}
