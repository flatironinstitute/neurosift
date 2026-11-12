import { FunctionComponent } from "react";
import ShareTabButton from "./ShareTabButton";

const TOOLBAR_HEIGHT = 24;

type TabToolbarProps = {
  width: number;
  tabId: string;
  nwbUrl: string;
  path?: string;
};

const TabToolbar: FunctionComponent<TabToolbarProps> = ({
  width,
  tabId,
  nwbUrl,
  path,
}) => {
  // Show path in single view only (when path prop is provided)
  const shouldShowPath = path !== undefined;

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
        gap: 12,
      }}
    >
      <ShareTabButton tabId={tabId} nwbUrl={nwbUrl} />
      {shouldShowPath && (
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
      )}
    </div>
  );
};

export { TOOLBAR_HEIGHT };
export default TabToolbar;
