import { SettingPair, TextInput } from "@ui";
import { FunctionComponent } from "react";

type WindowRangeProps = {
  windowRangeStr: { start: string; end: string };
  setWindowRangeStr: (x: { start: string; end: string }) => void;
};

/** Seconds before and after each aligned time. */
const WindowRangeComponent: FunctionComponent<WindowRangeProps> = ({
  windowRangeStr,
  setWindowRangeStr,
}) => {
  const invalid = !(
    parseFloat(windowRangeStr.end) > parseFloat(windowRangeStr.start)
  );
  return (
    <SettingPair>
      <TextInput
        label="From (s)"
        size="sm"
        value={windowRangeStr.start}
        onChange={(start) => setWindowRangeStr({ ...windowRangeStr, start })}
        error={invalid ? "Use a number below To." : undefined}
      />
      <TextInput
        label="To (s)"
        size="sm"
        value={windowRangeStr.end}
        onChange={(end) => setWindowRangeStr({ ...windowRangeStr, end })}
      />
    </SettingPair>
  );
};

export default WindowRangeComponent;
