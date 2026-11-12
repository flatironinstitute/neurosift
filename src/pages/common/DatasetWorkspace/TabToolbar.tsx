import { FunctionComponent } from "react";
import ShareTabButton from "./ShareTabButton";
import { DatasetFile } from "./plugins/pluginInterface";

const TOOLBAR_HEIGHT = 24;

type TabToolbarProps = {
  width: number;
  file: DatasetFile;
};

const TabToolbar: FunctionComponent<TabToolbarProps> = ({ width, file }) => {
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
        {file.filepath}
      </div>
      <div
        style={{
          marginLeft: 12,
          display: "flex",
          alignItems: "center",
          minWidth: 28,
        }}
      >
        <ShareTabButton file={file} />
      </div>
    </div>
  );
};

export { TOOLBAR_HEIGHT };
export default TabToolbar;
