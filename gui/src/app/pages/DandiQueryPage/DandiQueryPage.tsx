/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import useRoute from "../../useRoute";
import pako from "pako";
import NeurodataTypesSelector from "./NeurodataTypesSelector";
import { Hyperlink } from "@fi-sci/misc";
import JsonPathQueryComponent from "./JsonPathQueryComponent";
import Splitter from "app/Splitter/Splitter";
import TabWidget from "app/TabWidget/TabWidget";
import SearchByNeurodataTypeWindow from "./SearchByNeurodataTypeWindow";
import SearchByAbstractWindow from "./SearchByAbstractWindow";
import { getInitialSideChatWidth } from "../DandiPage/DandiPage";
import ChatPanel, { Chat, emptyChat } from "app/ChatPanel/ChatPanel";

type DandiQueryPageProps = {
  width: number;
  height: number;
};

const DandiQueryPage: FunctionComponent<DandiQueryPageProps> = ({
  width,
  height,
}) => {
  const initialSideChatWidth = getInitialSideChatWidth(width);
  const [chat, setChat] = useState<Chat>(emptyChat);
  return (
    <Splitter
      width={width}
      height={height}
      initialPosition={initialSideChatWidth}
    >
      <ChatPanel width={0} height={0} chat={chat} setChat={setChat} />
      <DandiQueryPageContent width={0} height={0} />;
    </Splitter>
  );
};

const tabs = [
  {
    label: "Search by Neurodata Type",
    id: "search-by-neurodata-type",
    closeable: false,
  },
  {
    label: "Search by abstract",
    id: "search-by-abstract",
    closeable: false,
  },
];

const DandiQueryPageContent: FunctionComponent<DandiQueryPageProps> = ({
  width,
  height,
}) => {
  const [currentTabId, setCurrentTabId] = useState<string>(
    "search-by-neurodata-type",
  );
  return (
    <TabWidget
      tabs={tabs}
      width={width}
      height={height}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
      onCloseTab={undefined}
    >
      <SearchByNeurodataTypeWindow width={0} height={0} />
      <SearchByAbstractWindow width={0} height={0} />
    </TabWidget>
  );
};

export default DandiQueryPage;
