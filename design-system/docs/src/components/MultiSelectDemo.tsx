import { MultiSelect } from "@ui";
import { useState } from "react";

const TYPES = [
  "BehavioralEvents",
  "ElectricalSeries",
  "ImageSegmentation",
  "ImageSeries",
  "OptogeneticSeries",
  "PlaneSegmentation",
  "RoiResponseSeries",
  "SpatialSeries",
  "TimeIntervals",
  "TimeSeries",
  "TwoPhotonSeries",
  "Units",
].map((type) => ({ value: type, label: type }));

/** Neurodata Types Search: files that contain every type chosen. */
export default function MultiSelectDemo() {
  const [types, setTypes] = useState(["ElectricalSeries", "Units"]);
  return (
    <div className="section-demo">
      <MultiSelect
        label="Neurodata types"
        helper="Finds files that contain every type you choose. Type “Series” to see matches anywhere in a name."
        options={TYPES}
        value={types}
        onChange={setTypes}
        code
        noun="types"
      />
    </div>
  );
}
