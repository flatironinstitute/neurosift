import { FunctionComponent, PropsWithChildren } from "react";
import { useInView } from "react-intersection-observer";

type Props = {
  width: number;
  height: number;
};

const IfVisible: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
  width,
  height,
}) => {
  const { inView, ref } = useInView({ trackVisibility: true, delay: 400 });
  return (
    <div ref={ref} style={{ position: "relative", width, height }}>
      {inView ? children : <span>.</span>}
    </div>
  );
};

export default IfVisible;
