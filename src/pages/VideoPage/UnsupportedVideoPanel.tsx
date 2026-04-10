import { FunctionComponent } from "react";

type Props = {
  message: string;
};

const UnsupportedVideoPanel: FunctionComponent<Props> = ({ message }) => {
  return (
    <div
      style={{
        marginBottom: "12px",
        padding: "18px 20px",
        border: "1px solid #f1b5b5",
        borderRadius: 8,
        background: "#fff5f5",
        color: "#8a1c1c",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Video Not Supported
      </div>
      <div style={{ lineHeight: 1.5 }}>{message}</div>
    </div>
  );
};

export default UnsupportedVideoPanel;
