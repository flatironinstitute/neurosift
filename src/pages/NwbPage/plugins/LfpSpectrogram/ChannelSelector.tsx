import { Checkbox } from "@ui";
import { FunctionComponent } from "react";
import "./LfpSpectrogramView.css";

type Props = {
  numChannels: number;
  selected: number[];
  setSelected: (channels: number[]) => void;
};

/** A checkbox per channel, after an "All channels" box that selects all or clears. */
const ChannelSelector: FunctionComponent<Props> = ({
  numChannels,
  selected,
  setSelected,
}) => {
  const selectedSet = new Set(selected);
  const allSelected = numChannels > 0 && selected.length === numChannels;

  const toggle = (ch: number) => {
    if (selectedSet.has(ch)) {
      setSelected(selected.filter((c) => c !== ch));
    } else {
      setSelected([...selected, ch]);
    }
  };

  return (
    <div className="lfp-spectrogram-channels">
      <Checkbox
        label="All channels"
        checked={allSelected ? true : selected.length > 0 ? "mixed" : false}
        onChange={() =>
          setSelected(
            selected.length > 0
              ? []
              : Array.from({ length: numChannels }, (_, i) => i),
          )
        }
      />
      {Array.from({ length: numChannels }, (_, ch) => (
        <Checkbox
          key={ch}
          label={`Channel ${ch}`}
          checked={selectedSet.has(ch)}
          onChange={() => toggle(ch)}
        />
      ))}
    </div>
  );
};

export default ChannelSelector;
