import useRoute from "neurosift-lib/contexts/useRoute";
import { FunctionComponent } from "react";
import DandiBrowser from "./DandiBrowser/DandiBrowser";

type DandiPageProps = {
  width: number;
  height: number;
  // showChat?: boolean;
};

const DandiPage: FunctionComponent<DandiPageProps> = ({
  width,
  height,
  // showChat,
}) => {
  const { route } = useRoute();
  if (route.page !== "dandi")
    throw Error("Unexpected route for DandiPage: " + route.page);
  // const initialSideChatWidth = getInitialSideChatWidth(width);
  // const [chat, setChat] = useState<Chat>(emptyChat);
  return <DandiBrowser width={width} height={height} />;
  // return (
  //   <Splitter
  //     width={width}
  //     height={height}
  //     initialPosition={initialSideChatWidth}
  //     hideFirstChild={!showChat}
  //   >
  //     <ChatPanel width={0} height={0} chat={chat} setChat={setChat} />
  //     <DandiBrowser width={0} height={0} />;
  //   </Splitter>
  // );
};

export const getInitialSideChatWidth = (width: number) => {
  if (width > 600) return Math.min(300, width / 3);
  if (width > 400) return Math.min(150, width / 2);
  return 0;
};

export default DandiPage;
