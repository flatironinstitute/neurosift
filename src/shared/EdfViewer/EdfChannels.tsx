import { Checkbox } from "@ui";
import { FunctionComponent } from "react";
import "./EdfViewer.css";

type Props = {
  labels: string[];
  rates: ArrayLike<number>;
  selected: number[];
  onChange: (selected: number[]) => void;
};

/** A checkbox per EDF signal with its rate, after All channels. */
const EdfChannels: FunctionComponent<Props> = ({
  labels,
  rates,
  selected,
  onChange,
}) => {
  const all = selected.length === labels.length;
  const toggle = (i: number) =>
    onChange(
      selected.includes(i)
        ? selected.filter((x) => x !== i)
        : [...selected, i].sort((a, b) => a - b),
    );
  return (
    <div className="edf-channels">
      <Checkbox
        label="All channels"
        checked={all ? true : selected.length > 0 ? "mixed" : false}
        onChange={() => onChange(all ? [] : labels.map((_, i) => i))}
      />
      {labels.map((label, i) => (
        <Checkbox
          key={i}
          label={label}
          count={rates[i] ? `${rates[i].toLocaleString("en-US")} Hz` : ""}
          checked={selected.includes(i)}
          onChange={() => toggle(i)}
        />
      ))}
    </div>
  );
};

export default EdfChannels;
