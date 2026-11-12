import { FunctionComponent } from "react";
import { TOOLBAR_HEIGHT } from "../TabToolbar";

type ObjectHeaderBarProps = {
  width: number;
  path: string;
};

const ObjectHeaderBar: FunctionComponent<ObjectHeaderBarProps> = ({
  width,
  path,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width,
        height: TOOLBAR_HEIGHT,
        backgroundColor: "#f5f5f5",
        borderBottom: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
      }}
    >
      <div
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          fontSize: "12px",
          color: "#666",
        }}
      >
        {path}
      </div>
    </div>
  );
};

export default ObjectHeaderBar;
