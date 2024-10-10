import { FunctionComponent, useEffect, useState } from "react";
import DandiBrowser from "./DandiBrowser/DandiBrowser";
import { useContextChat } from "app/ContextChat/ContextChat";
import useRoute from "app/useRoute";
import Splitter from "app/Splitter/Splitter";
import ChatPanel, { Chat, emptyChat } from "app/ChatPanel/ChatPanel";

type DandiPageProps = {
  width: number;
  height: number;
};

const DandiPage: FunctionComponent<DandiPageProps> = ({ width, height }) => {
  const { setContextItem } = useContextChat();
  const { route } = useRoute();
  if (route.page !== "dandi")
    throw Error("Unexpected route for DandiPage: " + route.page);
  useEffect(() => {
    let x = `
The user is viewing a list of Dandisets, each with a title and meta information such as the number of assets and the total size.
They can filter the list by entering a search term in the search bar.
There is also a list of recently viewed Dandisets by Dandiset ID.
If they click on a Dandiset they will be taken to the page of that Dandiset.
Only public Dandisets are shown by default.
If the user wants to see embargoed Dandisets then they can click the key icon in the upper right corner and enter their DANDI API key, then reload the page.
Note that the DANDI API key is stored in the browser's local storage, and is not sent to the Neurosift server.
To learn more about Neurosift, the user can click the question mark icon in the upper right corner.
The user can click the "advanced query" link to search for Dandisets by neurodata type and other criteria.
This type of view can also be seen at https://dandiarchive.org.
`;
    if (route.staging) {
      x += `The user is viewing the staging server of the DANDI Archive. They can switch to the main site by clicking the "use main site" link.`;
    } else {
      x += `The user is viewing the main site of the DANDI Archive. They can switch to the staging site by clicking the "use staging site" link.`;
    }
    setContextItem("dandi-page", { content: x });
    return () => {
      setContextItem("dandi-page", undefined);
    };
  }, [setContextItem, route.staging]);
  const initialSideChatWidth = getInitialSideChatWidth(width);
  const [chat, setChat] = useState<Chat>(emptyChat);
  return (
    <Splitter
      width={width}
      height={height}
      initialPosition={initialSideChatWidth}
    >
      <ChatPanel width={0} height={0} chat={chat} setChat={setChat} />
      <DandiBrowser width={0} height={0} />;
    </Splitter>
  );
};

export const getInitialSideChatWidth = (width: number) => {
  if (width > 600) return Math.min(300, width / 3);
  if (width > 400) return Math.min(150, width / 2);
  return 0;
};

export default DandiPage;
