import { FunctionComponent, useEffect, useState } from "react";
import SelectorDropdown from "./SelectorDropdown";
import { readConditions, SelectorOption } from "./useChain";

interface Props {
  nwbUrl: string;
  value: number | undefined;
  onChange: (row: number | undefined) => void;
}

const ConditionSelector: FunctionComponent<Props> = ({
  nwbUrl,
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
        const xs = await readConditions(nwbUrl);
        if (!cancelled) setOptions(xs);
      } catch (exc) {
        if (!cancelled)
          setError(exc instanceof Error ? exc.message : String(exc));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nwbUrl]);

  return (
    <SelectorDropdown
      label="Condition"
      options={options}
      value={value}
      onChange={onChange}
      childLabel="rep"
      error={error}
      allowAll
    />
  );
};

export default ConditionSelector;
