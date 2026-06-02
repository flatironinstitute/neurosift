import { FunctionComponent } from "react";
import SelectorDropdown from "./SelectorDropdown";
import { ResolvedSweep, SelectorOption } from "./useChain";

interface Props {
  // The candidate IRT rows surfaced by the chain walk at the parent scope.
  availableSweeps: ResolvedSweep[];
  value: number | undefined;
  onChange: (row: number | undefined) => void;
}

const SweepSelector: FunctionComponent<Props> = ({
  availableSweeps,
  value,
  onChange,
}) => {
  const options: SelectorOption[] = availableSweeps.map((s) => ({
    row: s.irtRow,
    label: `irt_row ${s.irtRow}`,
    nChildren: 0,
  }));

  return (
    <SelectorDropdown
      label="Sweep"
      options={options}
      value={value}
      onChange={onChange}
      allowAll
      // Sweep gates rendering, so stay visible even with one option.
      // See the design-decision note on SelectorDropdown.Props.
      hideWhenSingleOption={false}
    />
  );
};

export default SweepSelector;
