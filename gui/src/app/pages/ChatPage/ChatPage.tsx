/* eslint-disable @typescript-eslint/no-explicit-any */
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { NeurosiftSavedChatsLoginView } from "app/ApiKeysWindow/ApiKeysWindow";
import useNeurosiftSavedChats from "app/NeurosiftSavedChats/useNeurosiftSavedChats";
import Splitter from "app/Splitter/Splitter";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ORMessage } from "../DandisetPage/DandisetViewFromDendro/openRouterTypes";
import { useSavedChats } from "../SavedChatsPage/savedChatsApi";
import chatCompletion from "./chatCompletion";
import ChatWindow, { Chat } from "./ChatWindow";
import useRoute from "app/useRoute";
import { Hyperlink } from "@fi-sci/misc";

type ChatPageProps = {
  width: number;
  height: number;
};

const ChatPage: FunctionComponent<ChatPageProps> = ({ width, height }) => {
  const { route } = useRoute();
  if (route.page !== "chat") throw Error("Unexpected route: " + route.page);
  const { chatId: chatIdFromRoute } = route;

  const { savedChats } = useSavedChats({
    load: chatIdFromRoute ? true : false,
    chatId: chatIdFromRoute,
  });

  if (chatIdFromRoute && !savedChats) {
    return <div>Loading...</div>;
  } else if (chatIdFromRoute && savedChats) {
    return (
      <ChatPageChild
        width={width}
        height={height}
        initialChat={
          savedChats.find((c) => c.chatId === chatIdFromRoute) || null
        }
      />
    );
  } else {
    return <ChatPageChild width={width} height={height} initialChat={null} />;
  }
};

const ChatPageChild: FunctionComponent<
  ChatPageProps & { initialChat: Chat | null }
> = ({ width, height, initialChat }) => {
  const [openRouterKey, setOpenRouterKey] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat>({ messages: [] });
  const [additionalKnowledge, setAdditionalKnowledge] = useState<string>("");
  usePersistAdditionalKnowledge(additionalKnowledge, setAdditionalKnowledge);
  const logger = useMemo(() => new Logger(), []);
  const handleLogMessage = useCallback(
    (title: string, message: string) => {
      logger.log(title, message);
    },
    [logger],
  );
  useEffect(() => {
    if (!initialChat) return;
    setChat(initialChat);
  }, [initialChat]);
  return (
    <Splitter
      width={width}
      height={height}
      direction="horizontal"
      initialPosition={Math.min(300, width / 2)}
    >
      <LeftPanel
        width={0}
        height={0}
        chat={chat}
        openRouterKey={openRouterKey}
        setOpenRouterKey={setOpenRouterKey}
        logger={logger}
        additionalKnowledge={additionalKnowledge}
        setAdditionalKnowledge={setAdditionalKnowledge}
      />
      <ChatWindow
        width={0}
        height={0}
        chat={chat}
        setChat={setChat}
        openRouterKey={openRouterKey}
        onLogMessage={handleLogMessage}
        additionalKnowledge={additionalKnowledge}
      />
    </Splitter>
  );
};

type LeftPanelProps = {
  width: number;
  height: number;
  openRouterKey: string | null;
  setOpenRouterKey: (openRouterKey: string | null) => void;
  logger: Logger;
  additionalKnowledge: string;
  setAdditionalKnowledge: (additionalKnowledge: string) => void;
  chat: Chat;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  openRouterKey,
  setOpenRouterKey,
  logger,
  additionalKnowledge,
  setAdditionalKnowledge,
  chat,
}) => {
  const [logMessages, setLogMessages] = useState<
    { title: string; message: string }[]
  >([]);
  useEffect(() => {
    logger.addCallback((title, message) => {
      setLogMessages((prev) => [...prev, { title, message }]);
    });
  }, [logger]);
  const {
    handleOpen: openAdditionalKnowledge,
    handleClose: closeAdditionalKnowledge,
    visible: additionalKnowledgeVisible,
  } = useModalWindow();
  const {
    handleOpen: openSaveChat,
    handleClose: closeSaveChat,
    visible: saveChatVisible,
  } = useModalWindow();
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <div style={{ padding: 20 }}>
        <OpenRouterKeySelector
          openRouterKey={openRouterKey}
          setOpenRouterKey={setOpenRouterKey}
        />
        <hr />
        <button onClick={openAdditionalKnowledge} style={{ marginBottom: 10 }}>
          Additional knowledge ({additionalKnowledge.length})
        </button>
        &nbsp;
        <button onClick={openSaveChat}>Save chat</button>
        <hr />
        {logMessages.map((m, i) => (
          <ExpandableLogMessage key={i} title={m.title} message={m.message} />
        ))}
      </div>
      <ModalWindow
        visible={additionalKnowledgeVisible}
        onClose={closeAdditionalKnowledge}
      >
        <EditAdditionalKnowledge
          additionalKnowledge={additionalKnowledge}
          setAdditionalKnowledge={setAdditionalKnowledge}
        />
      </ModalWindow>
      <ModalWindow visible={saveChatVisible} onClose={closeSaveChat}>
        <SaveChatDialog
          chat={chat}
          onClose={closeSaveChat}
          openRouterKey={openRouterKey}
        />
      </ModalWindow>
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

type EditAdditionalKnowledgeProps = {
  additionalKnowledge: string;
  setAdditionalKnowledge: (additionalKnowledge: string) => void;
};

const EditAdditionalKnowledge: FunctionComponent<
  EditAdditionalKnowledgeProps
> = ({ additionalKnowledge, setAdditionalKnowledge }) => {
  // edit the additional knowledge in a text area of height 400
  return (
    <div style={{ padding: 20 }}>
      <p>
        You can add additional knowledge for the assistant here. This is a
        convenient way to develop the assistant. Reach out to the Neurosift team
        to propose adding this knowledge to the assistant.
      </p>
      <textarea
        style={{ width: "100%", height: 400 }}
        value={additionalKnowledge}
        onChange={(e) => setAdditionalKnowledge(e.target.value)}
      />
    </div>
  );
};

const usePersistAdditionalKnowledge = (
  additionalKnowledge: string,
  setAdditionalKnowledge: (additionalKnowledge: string) => void,
) => {
  const localStorageKey = "additionalKnowledge";
  const didInitialLoad = useRef(false);
  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      const ak = localStorage.getItem(localStorageKey);
      if (ak) {
        setAdditionalKnowledge(ak);
      }
    }
  }, [setAdditionalKnowledge]);
  useEffect(() => {
    if (!didInitialLoad.current) {
      return;
    }
    localStorage.setItem(localStorageKey, additionalKnowledge);
  }, [additionalKnowledge]);
};

type SaveChatDialogProps = {
  chat: Chat;
  onClose: () => void;
  openRouterKey: string | null;
};

const SaveChatDialog: FunctionComponent<SaveChatDialogProps> = ({
  chat,
  onClose,
  openRouterKey,
}) => {
  const { addSavedChat } = useSavedChats({ load: false });
  const { neurosiftSavedChatsAccessToken, neurosiftSavedChatsUserId } =
    useNeurosiftSavedChats();
  const [chatTitle, setChatTitle] = useState<string>("");
  const [chatLink, setChatLink] = useState<string | null>(null);
  const recommendedChatTitle = useRecommendedChatTitle(chat, openRouterKey);
  useEffect(() => {
    setChatTitle((c) => (!c ? recommendedChatTitle : c));
  }, [recommendedChatTitle]);
  const { setRoute } = useRoute();
  if (!neurosiftSavedChatsAccessToken) {
    return <NeurosiftSavedChatsLoginView />;
  }
  if (chatLink) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Chat saved</h3>
        <p>
          You can view your chat at {chatLink} <CopyButton text={chatLink} />
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
  if (!addSavedChat) {
    return <div>Unexpected: addSavedChat is not available</div>;
  }
  return (
    <div style={{ padding: 20 }}>
      <h3>
        Your chat will be publicly visible under your user ID:{" "}
        {neurosiftSavedChatsUserId}
      </h3>
      <hr />
      <div>
        <EditChatTitleComponent
          chatTitle={chatTitle}
          setChatTitle={setChatTitle}
        />
      </div>
      <div>
        <button
          onClick={async () => {
            const ok = window.confirm(
              "Are you sure you want to save this chat publicly?",
            );
            if (!ok) {
              return;
            }
            const chatId = await addSavedChat({
              chatTitle,
              messages: chat.messages,
              dandisetId: undefined,
            });
            if (!chatId) {
              alert("Failed to save chat");
            }
            setChatLink("https://neurosift.app?p=/chat&chatId=" + chatId);
          }}
          disabled={!chatTitle}
        >
          Save chat
        </button>
        &nbsp;
        <button onClick={onClose}>Cancel</button>
      </div>
      <hr />
      <div>
        <Hyperlink
          onClick={() => {
            setRoute({ page: "saved-chats" });
          }}
        >
          View saved chats
        </Hyperlink>
      </div>
    </div>
  );
};

const EditChatTitleComponent: FunctionComponent<{
  chatTitle: string;
  setChatTitle: (chatTitle: string) => void;
}> = ({ chatTitle, setChatTitle }) => {
  return (
    <div>
      <label>Chat title&nbsp;</label>
      <input
        type="text"
        value={chatTitle}
        onChange={(e) => setChatTitle(e.target.value)}
        style={{ width: "100%" }}
      />
    </div>
  );
};

const useRecommendedChatTitle = (chat: Chat, openRouterKey: string | null) => {
  const [recommendedChatTitle, setRecommendedChatTitle] = useState<string>("");
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (!openRouterKey) {
        return;
      }
      const messages: ORMessage[] = [
        ...chat.messages.filter((m) => m.role !== "client-side-only"),
        {
          role: "user",
          content:
            "What is a short recommended title for this chat? Respond with the chat title only.",
        },
      ];
      const response = await chatCompletion({
        messages,
        modelName: "gpt-4o-mini",
        openRouterKey,
        tools: [],
      });
      if (canceled) return;
      const x = response.assistantMessage;
      // remove "" and strip
      const y = x.replace(/^"(.*)"$/, "$1").trim();
      setRecommendedChatTitle(y);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [chat, openRouterKey]);
  return recommendedChatTitle;
};

const CopyButton: FunctionComponent<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

export default ChatPage;
