import { FunctionComponent, PropsWithChildren, useRef } from "react";
import { useInView } from "react-intersection-observer";

type Props = {
  width: number;
  height: number;
};

const IfHasBeenVisible: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
  width,
  height,
}) => {
  const hasBeenVisible = useRef(false);
  const { inView, ref } = useInView({ trackVisibility: true, delay: 400 });
  if (inView) hasBeenVisible.current = true;
  return (
    <div ref={ref} style={{ position: "relative", width, height }}>
      {inView || hasBeenVisible.current ? children : <span>.</span>}
    </div>
  );
};

export default IfHasBeenVisible;
