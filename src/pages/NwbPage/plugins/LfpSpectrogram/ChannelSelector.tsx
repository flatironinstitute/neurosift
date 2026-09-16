import { FunctionComponent } from "react";

type Props = {
  numChannels: number;
  selected: number[];
  setSelected: (channels: number[]) => void;
  height?: number;
};

// A scrolling multi-select list of channels (checkbox per channel), styled
// after the PSTH unit selector. The header checkbox toggles all/none.
const ChannelSelector: FunctionComponent<Props> = ({
  numChannels,
  selected,
  setSelected,
  height = 130,
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
    <div
      style={{
        height,
        width: 150,
        overflowY: "auto",
        border: "1px solid #dee2e6",
        borderRadius: 4,
        background: "white",
        fontSize: 12,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#f8f9fa",
          borderBottom: "1px solid #e9ecef",
          padding: "3px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {}}
          onClick={() =>
            setSelected(
              selected.length > 0
                ? []
                : Array.from({ length: numChannels }, (_, i) => i),
            )
          }
          title={selected.length > 0 ? "Clear selection" : "Select all"}
        />
        <span style={{ color: "#495057" }}>
          {selected.length}/{numChannels}
        </span>
      </div>
      {Array.from({ length: numChannels }, (_, ch) => (
        <label
          key={ch}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={selectedSet.has(ch)}
            onChange={() => toggle(ch)}
          />
          <span>Channel {ch}</span>
        </label>
      ))}
    </div>
  );
};

export default ChannelSelector;
