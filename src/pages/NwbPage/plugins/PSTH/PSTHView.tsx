import { useCallback, useState } from "react";
import PSTHItemView from "./PSTHItemView/PSTHItemView";

type Props = {
  nwbUrl: string;
  path: string;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

const getInitialStateFromHash = (): string | undefined => {
  const hash = window.location.hash;
  if (!hash) return undefined;
  const params = new URLSearchParams(hash.substring(1));
  return params.get("psth") || undefined;
};

const PSTHView = ({ nwbUrl, path, secondaryPaths, width, height }: Props) => {
  const [initialStateString] = useState<string | undefined>(() =>
    getInitialStateFromHash(),
  );

  const setStateString = useCallback((stateString: string) => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash ? hash.substring(1) : "");
    params.set("psth", stateString);
    const newHash = "#" + params.toString();
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, []);

  return (
    <PSTHItemView
      width={width || 800}
      height={height || 800}
      nwbUrl={nwbUrl}
      path={path}
      additionalPaths={secondaryPaths}
      initialStateString={initialStateString}
      setStateString={setStateString}
    />
  );
};

export default PSTHView;
