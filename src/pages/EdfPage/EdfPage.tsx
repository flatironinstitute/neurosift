import { FunctionComponent } from "react";
import { useSearchParams } from "react-router-dom";
import EdfViewer from "@shared/EdfViewer/EdfViewer";

type Props = {
  width: number;
  height: number;
};

const EdfPage: FunctionComponent<Props> = ({ width, height }) => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url");
  const versionId = searchParams.get("versionId");

  if (!url) {
    return <div>URL parameter is required</div>;
  }

  // If url contains double quotes at start/end, remove them
  const cleanUrl = url.replace(/^"(.*)"$/, "$1");

  // Construct the full URL with versionId if provided
  const fullUrl = versionId ? `${cleanUrl}?versionId=${versionId}` : cleanUrl;

  return <EdfViewer edfUrl={fullUrl} width={width} height={height} />;
};

export default EdfPage;
