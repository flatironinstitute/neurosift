import { FunctionComponent } from "react";
import ShareTabButton from "./ShareTabButton";

const TOOLBAR_HEIGHT = 24;

type TabToolbarProps = {
  width: number;
  tabId: string;
  nwbUrl: string;
  path?: string;
  paths?: string[];
};

const TabToolbar: FunctionComponent<TabToolbarProps> = ({
  width,
  tabId,
  nwbUrl,
  path,
  paths,
}) => {
  const displayPath =
    path || (paths && paths.length > 0 ? paths.join(", ") : "");

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
        {displayPath}
      </div>
      <div
        style={{
          marginLeft: 12,
          display: "flex",
          alignItems: "center",
          minWidth: 28,
        }}
      >
        <ShareTabButton tabId={tabId} nwbUrl={nwbUrl} />
      </div>
    </div>
  );
};

export { TOOLBAR_HEIGHT };
export default TabToolbar;
