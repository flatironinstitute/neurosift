import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, Close, Help } from "@mui/icons-material";
import Markdown from "app/Markdown/Markdown";
import useRoute from "app/useRoute";
import { NeurosiftCompletionClient } from "NwbchatClient/NwbchatClient";
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ORMessage } from "./openRouterTypes";

type ContextChatProps = {
  width: number;
  height: number;
  onClose: () => void;
};

const ContextChat: FunctionComponent<ContextChatProps> = ({
  width,
  height,
  onClose,
}) => {
  const inputBarHeight = 30;
  const settingsBarHeight = 20;
  const topBarHeight = 20;

  const { route } = useRoute();

  const [messages, setMessages] = useState<ORMessage[]>([]);

  const [modelName, setModelName] = useState("openai/gpt-4o-mini");

  const handleUserMessage = useCallback(
    (message: string) => {
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === "user") {
          // shouldn't happen, but just in case
          return prev;
        }
        return [...prev, { role: "user", content: message }];
      });
    },
    [setMessages],
  );

  const { contextStrings } = useContextChat();

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    if (lastMessage.role === "user") {
      const totalContextString = Object.values(contextStrings).join("\n");
      setTimeout(() => {
        // timeout to get the UI to update from the state change
        sendChatRequest(messages, totalContextString, modelName).then(
          (responseMessage) => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: responseMessage },
            ]);
          },
        );
      }, 10);
    }
  }, [messages, contextStrings, modelName]);

  const lastMessageIsUser = useMemo(() => {
    return messages[messages.length - 1]?.role === "user";
  }, [messages]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleClearAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // reset the messages when the page name changes
  useEffect(() => {
    setMessages([]);
  }, [route.page]);

  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        style={{
          position: "absolute",
          width,
          height: topBarHeight,
          top: 0,
          left: 0,
          background: "gray",
          color: "white",
          fontSize: 12,
        }}
      >
        Context Chat{" "}
        <SmallIconButton
          icon={<Help />}
          title="Learn more about the context chat"
          fontSize={14}
          onClick={() => {
            alert("Not implemented yet");
            // const url =
            //   "https://gist.github.com/magland/7483a6bf2259babeaa06a1aa253821ad#file-neurosift_workshop_chat_info-md";
            // window.open(url, "_blank");
          }}
        />
      </div>
      <div
        className="close-button"
        style={{
          position: "absolute",
          width: topBarHeight,
          height: topBarHeight,
          top: -3,
          left: width - topBarHeight,
        }}
      >
        <SmallIconButton icon={<Close />} onClick={onClose} />
      </div>
      <div
        ref={chatContainerRef}
        style={{
          position: "absolute",
          width,
          top: topBarHeight,
          height: height - topBarHeight - inputBarHeight - settingsBarHeight,
          overflow: "auto",
        }}
      >
        {messages.map((c, index) => (
          <div
            key={index}
            ref={index === messages.length - 1 ? lastMessageRef : null}
            style={{
              color: colorForString(c.role),
            }}
          >
            <hr />
            {c.role === "assistant" ? (
              <>
                <Markdown source={c.content as string} />
              </>
            ) : c.role === "user" ? (
              <>
                <span>you: </span>
                <span style={{ color: "black" }}>
                  <MessageDisplay message={c.content as string} />
                </span>
              </>
            ) : (
              <span>Unknown role: {c.role}</span>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: inputBarHeight,
          top: height - inputBarHeight - settingsBarHeight,
          left: 0,
        }}
      >
        <InputBar
          width={width}
          height={inputBarHeight}
          onMessage={handleUserMessage}
          disabled={lastMessageIsUser}
          waitingForResponse={lastMessageIsUser}
        />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: settingsBarHeight,
          top: height - settingsBarHeight,
          left: 0,
        }}
      >
        <SettingsBar
          width={width}
          height={settingsBarHeight}
          onClearAllMessages={handleClearAllMessages}
          modelName={modelName}
          setModelName={setModelName}
        />
      </div>
    </div>
  );
};

type InputBarProps = {
  width: number;
  height: number;
  onMessage: (message: string) => void;
  disabled?: boolean;
  waitingForResponse?: boolean;
};

const InputBar: FunctionComponent<InputBarProps> = ({
  width,
  height,
  onMessage,
  disabled,
  waitingForResponse,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const messageString = e.currentTarget.value.trim();
        if (messageString.length > 1000) {
          alert("Message is too long");
          return;
        }
        onMessage(messageString);
        e.currentTarget.value = "";
      }
    },
    [onMessage],
  );
  return (
    <div style={{ position: "absolute", width, height }}>
      <input
        style={{ width: width - 8, height: height - 7 }}
        onKeyDown={handleKeyDown}
        placeholder={
          waitingForResponse ? "Waiting for response..." : "Type a message..."
        }
        disabled={disabled}
      />
    </div>
  );
};

type SettingsBarProps = {
  width: number;
  height: number;
  onClearAllMessages: () => void;
  modelName: string;
  setModelName: (name: string) => void;
};

const modelOptions = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  // 'anthropic/claude-3.5-sonnet',
  // 'anthropic/claude-3-haiku',
  // 'google/gemini-flash-1.5',
  // 'google/gemini-pro-1.5'
];

const SettingsBar: FunctionComponent<SettingsBarProps> = ({
  onClearAllMessages,
  modelName,
  setModelName,
}) => {
  return (
    <span style={{ fontSize: 12, padding: 5 }}>
      &nbsp;&nbsp;&nbsp;
      <SmallIconButton
        icon={<Cancel />}
        onClick={() => {
          if (confirm("Clear all messages?")) {
            onClearAllMessages();
          }
        }}
        title="Clear all messages"
      />
      &nbsp;
      <select value={modelName} onChange={(e) => setModelName(e.target.value)}>
        {modelOptions.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </span>
  );
};

const colorForString = (s: string) => {
  // s is a random user ID, we need to derive a color from it
  // This is a simple way to do it
  const hash = s.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const r = hash % 200;
  const g = (hash * 2) % 200;
  const b = (hash * 3) % 200;
  return `rgb(${r},${g},${b})`;
};

type MessageDisplayProps = {
  message: string;
};

const MessageDisplay: FunctionComponent<MessageDisplayProps> = ({
  message,
}) => {
  // turn URLs into hyperlinks
  const parts = message.split(" ");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? " " : ""}
          {part.startsWith("http://") || part.startsWith("https://") ? (
            <a href={part} target="_blank" rel="noreferrer">
              {part}
            </a>
          ) : (
            part
          )}
        </span>
      ))}
    </>
  );
};

const sendChatRequest = async (
  messages: ORMessage[],
  contextString: string,
  modelName: string,
) => {
  const systemLines: string[] = [];
  systemLines.push(
    "You are a helpful assistant that provides concise answers to technical questions.",
  );
  systemLines.push("Avoid lengthy explanations unless specifically asked.");
  systemLines.push(
    "The user is chatting with you in a chat window of software called Neurosift",
  );
  systemLines.push(
    "You should stick to answering questions related to the software and its usage as well as the data being analyzed and visualized.",
  );
  systemLines.push(
    "If you don't know the answer you can invite the user to use the question mark icon at the top to get more information.",
  );

  systemLines.push(`
Neurosift is a browser-based tool designed for the visualization of NWB (Neurodata Without Borders) files, whether stored locally or hosted remotely, and enables interactive exploration of the DANDI Archive.
`);

  const systemMessage: ORMessage = {
    role: "system",
    content: systemLines.join("\n") + "\n" + contextString,
  };
  console.info(systemMessage.content);
  const messages2 = [systemMessage, ...messages];

  const client = new NeurosiftCompletionClient({ verbose: true });
  const { response } = await client.completion(
    messages2.map((x) => ({
      role: x.role as string,
      content: x.content as string,
    })),
    modelName,
  );

  return response;
};

type ContextChatContextValue = {
  contextStrings: { [key: string]: string };
  setContextString: (key: string, value: string | undefined) => void;
};

const ContextChatContext = createContext<ContextChatContextValue | null>(null);

export const useContextChat = () => {
  const ret = useContext(ContextChatContext);
  if (!ret)
    throw Error("useContextChat must be used within a ContextChatProvider");
  return ret;
};

export const SetupContextChatContext: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const [contextStrings, setContextStrings] = useState<{
    [key: string]: string;
  }>({});
  const setContextString = useCallback(
    (key: string, value: string | undefined) => {
      setContextStrings((prev) => {
        if (!value) {
          if (!prev[key]) return prev;
          const new_prev = { ...prev };
          delete new_prev[key];
          return new_prev;
        }
        return { ...prev, [key]: value };
      });
    },
    [],
  );
  return (
    <ContextChatContext.Provider value={{ contextStrings, setContextString }}>
      {children}
    </ContextChatContext.Provider>
  );
};

export default ContextChat;
