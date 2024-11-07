/* eslint-disable @typescript-eslint/no-explicit-any */
import TabWidget from "app/TabWidget/TabWidget";
import { FunctionComponent, useState } from "react";
import SearchByAbstractWindow from "./SearchByAbstractWindow";
import SearchByNeurodataTypeWindow from "./SearchByNeurodataTypeWindow";

type DandiQueryPageProps = {
  width: number;
  height: number;
  // showChat?: boolean;
};

const DandiQueryPage: FunctionComponent<DandiQueryPageProps> = ({
  width,
  height,
  // showChat,
}) => {
  // const initialSideChatWidth = getInitialSideChatWidth(width);
  // const [chat, setChat] = useState<Chat>(emptyChat);
  return <DandiQueryPageContent width={width} height={height} />;
  // return (
  //   <Splitter
  //     width={width}
  //     height={height}
  //     initialPosition={initialSideChatWidth}
  //     hideFirstChild={!showChat}
  //   >
  //     <ChatPanel width={0} height={0} chat={chat} setChat={setChat} />
  //     <DandiQueryPageContent width={0} height={0} />;
  //   </Splitter>
  // );
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
