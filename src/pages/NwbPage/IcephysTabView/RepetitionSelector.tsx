import { FunctionComponent, useEffect, useState } from "react";
import SelectorDropdown from "./SelectorDropdown";
import { readRepetitions, SelectorOption } from "./useChain";

interface Props {
  nwbUrl: string;
  condRow: number | undefined; // upstream filter
  value: number | undefined;
  onChange: (row: number | undefined) => void;
}

const RepetitionSelector: FunctionComponent<Props> = ({
  nwbUrl,
  condRow,
  value,
  onChange,
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
    />
  );
};

export default RepetitionSelector;
