import React from "react";
import ScrollY from "@components/ScrollY";
import MainTab from "../MainTab";
import { TabContentProps } from "../Types";
import { SetupNwbFileSpecificationsProvider } from "../SpecificationsView/SetupNwbFileSpecificationsProvider";

const TabContent: React.FC<TabContentProps> = ({
  nwbUrl,
  width,
  height,
  onOpenObjectInNewTab,
  onOpenObjectsInNewTab,
}) => {
  return (
    <ScrollY width={width} height={height}>
      <SetupNwbFileSpecificationsProvider nwbUrl={nwbUrl}>
        <MainTab
          nwbUrl={nwbUrl}
          onOpenObjectInNewTab={onOpenObjectInNewTab}
          onOpenObjectsInNewTab={onOpenObjectsInNewTab}
        />
      </SetupNwbFileSpecificationsProvider>
    </ScrollY>
  );
};

export default TabContent;
