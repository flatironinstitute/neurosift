import { useCssVars } from "@components/useCssVars";
import { FunctionComponent } from "react";
import "./Figpack.css";

type Props = {
  width?: number;
  height?: number;
  figpackUrl: string;
  title: string;
};

const FigpackIframeDisplay: FunctionComponent<Props> = ({
  width,
  height,
  figpackUrl,
  title,
}) => {
  const ref = useCssVars<HTMLDivElement>({
    "--figpack-width": width ? `${width - 40}px` : "100%",
    "--figpack-height": height ? `${height - 100}px` : "calc(100vh - 200px)",
  });
  return (
    <div ref={ref} className="figpack-frame">
      <iframe src={figpackUrl} title={title} />
    </div>
  );
};

export default FigpackIframeDisplay;
