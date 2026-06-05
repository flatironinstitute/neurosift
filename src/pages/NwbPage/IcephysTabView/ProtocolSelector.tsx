import { FunctionComponent, useEffect, useState } from "react";
import SelectorDropdown from "./SelectorDropdown";
import { readSequentialProtocols, SelectorOption } from "./useChain";

interface Props {
  nwbUrl: string;
  repRow: number | undefined; // upstream filter
  value: number | undefined;
  onChange: (row: number | undefined) => void;
  optionEnabled?: (opt: SelectorOption) => boolean;
}

const ProtocolSelector: FunctionComponent<Props> = ({
  nwbUrl,
  repRow,
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
        const xs = await readSequentialProtocols(nwbUrl, repRow);
        if (!cancelled) setOptions(xs);
      } catch (exc) {
        if (!cancelled)
          setError(exc instanceof Error ? exc.message : String(exc));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nwbUrl, repRow]);

  return (
    <SelectorDropdown
      label="Protocol"
      options={options}
      value={value}
      onChange={onChange}
      childLabel="sweep"
      error={error}
      allowAll
      // Protocol gates rendering, so stay visible even with one option.
      // See the design-decision note on SelectorDropdown.Props.
      hideWhenSingleOption={false}
      optionEnabled={optionEnabled}
    />
  );
};

export default ProtocolSelector;
