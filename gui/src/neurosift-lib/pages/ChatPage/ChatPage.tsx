/* eslint-disable @typescript-eslint/no-explicit-any */
import Splitter from "../../components/Splitter";
import useRoute from "../../contexts/useRoute";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useSavedChats } from "../SavedChatsPage/savedChatsApi";
import { Chat, chatReducer, emptyChat } from "./Chat";
import { ChatContext } from "./ChatContext";
import ChatWindow from "./ChatWindow";
import { JupyterConnectivityProvider } from "./JupyterConnectivity";

type ChatPageProps = {
  width: number;
  height: number;
  jupyterConnectivityMode?: "jupyter-server" | "jupyterlab-extension";
};

const ChatPage: FunctionComponent<ChatPageProps> = ({
  width,
  height,
  jupyterConnectivityMode,
}) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "chat") throw Error("Unexpected route: " + route.page);
  const { chatId: chatIdFromRoute } = route;

  const { savedChats } = useSavedChats({
    load: chatIdFromRoute ? true : false,
    chatId: chatIdFromRoute,
  });

  const initialChat = chatIdFromRoute
    ? savedChats?.find((c) => c.chatId === chatIdFromRoute) || null
    : null;

  useEffect(() => {
    if (initialChat && initialChat.dandisetId) {
      setRoute({
        page: "dandiset",
        dandisetId: initialChat.dandisetId,
        chatId: initialChat.chatId,
      });
    }
  }, [initialChat, setRoute]);

  if (chatIdFromRoute && !savedChats) {
    return <div>Loading...</div>;
  } else if (initialChat) {
    return (
      <ChatPageChild
        width={width}
        height={height}
        initialChat={initialChat}
        jupyterConnectivityMode={jupyterConnectivityMode}
      />
    );
  } else {
    return (
      <ChatPageChild
        width={width}
        height={height}
        initialChat={null}
        jupyterConnectivityMode={jupyterConnectivityMode}
      />
    );
  }
};

const ChatPageChild: FunctionComponent<
  ChatPageProps & { initialChat: Chat | null }
> = ({ width, height, initialChat, jupyterConnectivityMode }) => {
  const [openRouterKey, setOpenRouterKey] = useState<string | null>(null);
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  const logger = useMemo(() => new Logger(), []);
  const handleLogMessage = useCallback(
    (title: string, message: string) => {
      logger.log(title, message);
    },
    [logger],
  );
  useEffect(() => {
    if (!initialChat) return;
    chatDispatch({ type: "set", chat: initialChat });
  }, [initialChat]);
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const chatContext: ChatContext = useMemo(
    () => ({
      type: "main",
    }),
    [],
  );
  return (
    <JupyterConnectivityProvider
      mode={jupyterConnectivityMode || "jupyter-server"}
    >
      <Splitter
        width={width}
        height={height}
        direction="horizontal"
        initialPosition={Math.min(300, width / 2)}
        hideFirstChild={!leftPanelVisible}
      >
        <LeftPanel
          width={0}
          height={0}
          chat={chat}
          openRouterKey={openRouterKey}
          setOpenRouterKey={setOpenRouterKey}
          logger={logger}
        />
        <ChatWindow
          width={0}
          height={0}
          chat={chat}
          chatDispatch={chatDispatch}
          openRouterKey={openRouterKey}
          onLogMessage={handleLogMessage}
          onToggleLeftPanel={() => setLeftPanelVisible((prev) => !prev)}
          chatContext={chatContext}
        />
      </Splitter>
    </JupyterConnectivityProvider>
  );
};

type LeftPanelProps = {
  width: number;
  height: number;
  openRouterKey: string | null;
  setOpenRouterKey: (openRouterKey: string | null) => void;
  logger: Logger;
  chat: Chat;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  openRouterKey,
  setOpenRouterKey,
  logger,
}) => {
  const [logMessages, setLogMessages] = useState<
    { title: string; message: string }[]
  >([]);
  useEffect(() => {
    logger.addCallback((title, message) => {
      setLogMessages((prev) => [...prev, { title, message }]);
    });
  }, [logger]);
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <div style={{ padding: 20 }}>
        <OpenRouterKeySelector
          openRouterKey={openRouterKey}
          setOpenRouterKey={setOpenRouterKey}
        />
        <hr />
        {logMessages.map((m, i) => (
          <ExpandableLogMessage key={i} title={m.title} message={m.message} />
        ))}
      </div>
    </div>
  );
};

type ExpandableLogMessageProps = {
  title: string;
  message: string;
};

const ExpandableLogMessage: FunctionComponent<ExpandableLogMessageProps> = ({
  title,
  message,
}) => {
  const [expanded, setExpanded] = useState(false);
  // a clickable triangle for expanding/collapsing the message
  return (
    <div>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? "▼" : "▶"} {title}
      </div>
      {expanded && (
        <div style={{ marginLeft: 20, whiteSpace: "pre-wrap" }}>{message}</div>
      )}
    </div>
  );
};

type OpenRouterKeySelectorProps = {
  openRouterKey: string | null;
  setOpenRouterKey: (openRouterKey: string | null) => void;
};

const OpenRouterKeySelector: FunctionComponent<OpenRouterKeySelectorProps> = ({
  openRouterKey,
  setOpenRouterKey,
}) => {
  useEffect(() => {
    const k = localStorage.getItem("openRouterKey");
    if (k) {
      setOpenRouterKey(k);
    }
  }, [setOpenRouterKey]);

  const handleChange = (e: any) => {
    const k = e.target.value;
    localStorage.setItem("openRouterKey", k);
    setOpenRouterKey(k);
  };

  return (
    <div>
      <label>
        <a href="https://openrouter.ai/" target="_blank" rel="noreferrer">
          OpenRouter
        </a>
        &nbsp;Key
      </label>
      &nbsp;
      <input
        type="password"
        value={openRouterKey || ""}
        onChange={handleChange}
      />
    </div>
  );
};

export class Logger {
  #callbacks: ((title: string, message: string) => void)[] = [];
  log(title: string, message: string) {
    for (const cb of this.#callbacks) {
      cb(title, message);
    }
  }
  addCallback(cb: (title: string, message: string) => void) {
    this.#callbacks.push(cb);
  }
}

export default ChatPage;
