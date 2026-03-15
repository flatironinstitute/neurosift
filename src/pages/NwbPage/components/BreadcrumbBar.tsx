import React from "react";
import { NeurodataSubView } from "../TabTypes";
import ShareTabButton from "../ShareTabButton";
import { ACTIVE_TAB_COLOR } from "@components/tabs/TabBar";

export const BREADCRUMB_HEIGHT = 32;

interface BreadcrumbBarProps {
  subView: NeurodataSubView;
  onNavigateBack: () => void;
  nwbUrl: string;
}

const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  subView,
  onNavigateBack,
  nwbUrl,
}) => {
  const label = getSubViewLabel(subView);
  const tabId = getSubViewTabId(subView);

  return (
    <div
      style={{
        height: BREADCRUMB_HEIGHT,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        backgroundColor: ACTIVE_TAB_COLOR,
        color: "#fff",
        fontSize: 13,
      }}
    >
      <span
        onClick={onNavigateBack}
        style={{
          cursor: "pointer",
          color: "rgba(255,255,255,0.85)",
          textDecoration: "underline",
          fontWeight: 500,
        }}
      >
        Neurodata
      </span>
      <span style={{ color: "rgba(255,255,255,0.6)" }}>&gt;</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <div style={{ color: "rgba(255,255,255,0.85)" }}>
        <ShareTabButton tabId={tabId} nwbUrl={nwbUrl} />
      </div>
      <span
        onClick={onNavigateBack}
        style={{
          marginLeft: "auto",
          cursor: "pointer",
          color: "rgba(255,255,255,0.85)",
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1,
          padding: "2px 4px",
        }}
        title="Back to Neurodata"
      >
        &times;
      </span>
    </div>
  );
};

function getSubViewLabel(subView: NeurodataSubView): string {
  if (subView.type === "single") {
    return subView.path;
  }
  return `${subView.paths.length} items`;
}

function getSubViewTabId(subView: NeurodataSubView): string {
  if (subView.type === "single") {
    let id = subView.secondaryPaths
      ? [subView.path, ...subView.secondaryPaths].join("^")
      : subView.path;
    if (subView.plugin) {
      id = `view:${subView.plugin.name}|${id}`;
    }
    return id;
  }
  return JSON.stringify(subView.paths);
}

export default BreadcrumbBar;
