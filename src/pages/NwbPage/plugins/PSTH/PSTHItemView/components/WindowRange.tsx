import { FunctionComponent } from "react";

type WindowRangeProps = {
  windowRangeStr: { start: string; end: string };
  setWindowRangeStr: (x: { start: string; end: string }) => void;
};

const WindowRangeComponent: FunctionComponent<WindowRangeProps> = ({
  windowRangeStr,
  setWindowRangeStr,
}) => {
  return (
    <>
      Window range (s):&nbsp;
      <input
        style={{ width: 50 }}
        type="text"
        value={windowRangeStr.start}
        onChange={(evt) => {
          setWindowRangeStr({
            start: evt.target.value,
            end: windowRangeStr.end,
          });
        }}
      />
      &nbsp;to&nbsp;
      <input
        style={{ width: 50 }}
        type="text"
        value={windowRangeStr.end}
        onChange={(evt) => {
          setWindowRangeStr({
            start: windowRangeStr.start,
            end: evt.target.value,
          });
        }}
      />
    </>
  );
};

export default WindowRangeComponent;
