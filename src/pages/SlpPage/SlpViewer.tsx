import ResponsiveLayout from "@components/ResponsiveLayout";
import { FunctionComponent } from "react";
import SlpLeftArea from "./SlpLeftArea";
import SlpMainWorkspace from "./SlpMainWorkspace";

type Props = {
  slpUrl: string;
  width: number;
  height: number;
};

const SlpViewer: FunctionComponent<Props> = ({ slpUrl, width, height }) => {
  const initialSplitterPosition = Math.max(200, Math.min(450, width / 3));
  return (
    <ResponsiveLayout
      width={width}
      height={height}
      initialSplitterPosition={initialSplitterPosition}
      mobileBreakpoint={768}
    >
      <SlpLeftArea slpUrl={slpUrl || ""} width={0} height={0} />
      <SlpMainWorkspace slpUrl={slpUrl} width={0} height={0} />
    </ResponsiveLayout>
  );
};

export default SlpViewer;
