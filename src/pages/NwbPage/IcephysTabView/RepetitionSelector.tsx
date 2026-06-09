import { FunctionComponent, useEffect, useState } from "react";
import SelectorDropdown from "./SelectorDropdown";
import { readRepetitions, SelectorOption } from "./useChain";

interface Props {
  nwbUrl: string;
  condRow: number | undefined; // upstream filter (pass undefined to list all)
  value: number | undefined;
  onChange: (row: number | undefined) => void;
  optionEnabled?: (opt: SelectorOption) => boolean;
}

const RepetitionSelector: FunctionComponent<Props> = ({
  nwbUrl,
  condRow,
  value,
  onChange,
  optionEnabled,
}) => {
  const [options, setOptions] = useState<SelectorOption[] | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setOptions(null);
    (async () => {
      try {
        const xs = await readRepetitions(nwbUrl, condRow);
        if (!cancelled) setOptions(xs);
      } catch (exc) {
        if (!cancelled)
          setError(exc instanceof Error ? exc.message : String(exc));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nwbUrl, condRow]);

  return (
    <SelectorDropdown
      label="Repetition"
      options={options}
      value={value}
      onChange={onChange}
      childLabel="protocol"
      error={error}
      allowAll
      optionEnabled={optionEnabled}
    />
  );
};

export default RepetitionSelector;
