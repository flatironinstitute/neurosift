import type { ReactNode } from "react";
import AuthErrorNotification from "../NwbPage/components/AuthErrorNotification";
import { useElementSize } from "../NwbPage/useElementSize";
import "./KeyRefusedFrame.css";

interface KeyRefusedFrameProps {
  /** The url whose archive refused the saved key; without it the page shows alone. */
  url?: string;
  height: number;
  children: (height: number) => ReactNode;
}

const WithNotice = ({
  url,
  height,
  children,
}: Required<KeyRefusedFrameProps>) => {
  const [notice, size] = useElementSize<HTMLDivElement>();
  return (
    <div className="key-refused-frame">
      <div ref={notice}>
        <AuthErrorNotification dandiUrl={url} access="keyRefusedOpen" />
      </div>
      {size.height > 0 && children(height - size.height)}
    </div>
  );
};

/** A page that opened without a refused API key, below the warning that says so. */
const KeyRefusedFrame = ({ url, height, children }: KeyRefusedFrameProps) =>
  url ? (
    <WithNotice url={url} height={height}>
      {children}
    </WithNotice>
  ) : (
    children(height)
  );

export default KeyRefusedFrame;
