import React from "react";
import ScrollY from "@components/ScrollY";
import MainTab from "../MainTab";
import { TabContentProps } from "../Types";

const TabContent: React.FC<TabContentProps> = ({
  nwbUrl,
  width,
  height,
  onOpenObjectInNewTab,
  onOpenObjectsInNewTab,
}) => {
  return (
    <ScrollY width={width} height={height}>
      <MainTab
        nwbUrl={nwbUrl}
        onOpenObjectInNewTab={onOpenObjectInNewTab}
        onOpenObjectsInNewTab={onOpenObjectsInNewTab}
      />
    </ScrollY>
  );
};

export default TabContent;
