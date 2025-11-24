import { FunctionComponent } from "react";
import { useSearchParams } from "react-router-dom";
import SlpViewer from "./SlpViewer";

type Props = {
  width: number;
  height: number;
};

const SlpPage: FunctionComponent<Props> = ({ width, height }) => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url");

  if (!url) {
    return <div>URL parameter is required</div>;
  }

  // If url contains double quotes at start/end, remove them
  const cleanUrl = url.replace(/^"(.*)"$/, "$1");

  return <SlpViewer slpUrl={cleanUrl} width={width} height={height} />;
};

export default SlpPage;
