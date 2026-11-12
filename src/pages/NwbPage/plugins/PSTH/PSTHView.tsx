import {
  useLinkedSettings,
  useShareSettings,
} from "@shared/shareLink/useShareSettings";
import { useRef, useState } from "react";
import PSTHItemView from "./PSTHItemView/PSTHItemView";
import { psthSettings, psthStateFromSettings } from "./psthSettings";

type Props = {
  nwbUrl: string;
  path: string;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

const PSTHView = ({ nwbUrl, path, secondaryPaths, width, height }: Props) => {
  const linked = useLinkedSettings();
  const [initialStateString] = useState(() => psthStateFromSettings(linked));
  const [stateString, setStateString] = useState<string>();
  const settings = stateString ? psthSettings(stateString) : [];
  // A link's units apply once the file's units load; until then it keeps them.
  const waiting = useRef(!!linked.get("units"));
  if (settings.some((s) => s.key === "units" && s.value))
    waiting.current = false;
  useShareSettings(waiting.current ? [] : settings);

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
