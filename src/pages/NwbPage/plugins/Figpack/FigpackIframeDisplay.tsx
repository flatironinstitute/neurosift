import { FunctionComponent } from "react";

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
  return (
    <div
      style={{
        width: width ? width - 40 : "100%",
        height: height ? height - 100 : "calc(100vh - 200px)",
        border: "1px solid #d9d9d9",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <iframe
        src={figpackUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title={title}
      />
    </div>
  );
};

export default FigpackIframeDisplay;
