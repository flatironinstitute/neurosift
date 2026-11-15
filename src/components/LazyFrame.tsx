import { FunctionComponent, ReactNode } from "react";
import { useInView } from "react-intersection-observer";

type Props = {
  /** Sizes the frame, so the space is held before the children render. */
  className: string;
  children: ReactNode;
};

/** Renders its children only once the frame has scrolled into view. */
const LazyFrame: FunctionComponent<Props> = ({ className, children }) => {
  const { inView, ref } = useInView({ triggerOnce: true });
  return (
    <div ref={ref} className={className}>
      {inView && children}
    </div>
  );
};

export default LazyFrame;
