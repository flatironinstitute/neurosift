import { FunctionComponent, PropsWithChildren } from "react";

const ScrollY: FunctionComponent<
  PropsWithChildren<{
    width: number;
    height: number;
    left?: number;
    top?: number;
  }>
> = ({ width, height, children, left = 0, top = 0 }) => {
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflowY: "auto",
        left,
        top,
      }}
    >
      {children}
    </div>
  );
};

export default ScrollY;
