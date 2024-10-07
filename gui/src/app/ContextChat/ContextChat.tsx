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
import { FaWindowMaximize, FaWindowRestore } from "react-icons/fa";
import { ORMessage } from "./openRouterTypes";

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "full";

type ContextChatProps = {
  width: number;
  height: number;
  onClose: () => void;
  position: Position;
  onSetPosition: (position: Position) => void;
};

const ContextChat: FunctionComponent<ContextChatProps> = ({
  width,
  height,
  onClose,
  position,
  onSetPosition,
}) => {
  const inputBarHeight = 30;
  const settingsBarHeight = 20;
  const topBarHeight = 20;

  const { route } = useRoute();

  const [messages, setMessages] = useState<
    (ORMessage | { role: "client-side-only"; content: string })[]
  >([]);

  const [modelName, setModelName] = useState("openai/gpt-4o");

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

  const { contextItems } = useContextChat();
  const [includedResourceDocs, setIncludedResourceDocs] = useState<string[]>(
    [],
  );

  useEffect(() => {
    const messages2: ORMessage[] = [
      ...messages.filter((x) => x.role !== "client-side-only"),
    ]; // important to make a copy
    const lastMessage = messages2[messages2.length - 1];
    if (!lastMessage) return;
    if (lastMessage.role === "user") {
      (async () => {
        for (let pass = 1; pass <= 2; pass++) {
          if (pass === 1) {
            // the selective loading of resources is not working well
            // so I am disabling it for now
            // for now we will just load all available resources
            continue;
          }
          let totalContextString = Object.values(contextItems)
            .map((c) => c.content)
            .join("\n");
          const allIncludedResourceDocs: {
            name: string;
            description: string;
            content: string;
          }[] = [];
          const allExcludedResourceDocs: {
            name: string;
            description: string;
            content: string;
          }[] = [];
          for (const item of Object.values(contextItems)) {
            if (item.resourceDocs) {
              for (const doc of item.resourceDocs) {
                if (includedResourceDocs.includes(doc.name)) {
                  allIncludedResourceDocs.push(doc);
                } else {
                  allExcludedResourceDocs.push(doc);
                }
              }
            }
          }
          // for (const doc of allIncludedResourceDocs) { // see note above
          for (const doc of [
            ...allIncludedResourceDocs,
            ...allExcludedResourceDocs,
          ]) {
            // see note above
            totalContextString += "\n" + doc.content;
          }
          if (pass === 1 && allExcludedResourceDocs.length > 0) {
            let newLastMessageContent =
              'The following resources are available. List by name those that are relevant to be able to response to the below prompt. Or if none of them are relevant, you should response with "none are relevant". I will then follow up with any relevant resources in my next message.\n';
            for (const doc of allExcludedResourceDocs) {
              newLastMessageContent += `${doc.name} - ${doc.description}\n`;
            }
            newLastMessageContent += "\n\nHere is the user's prompt:\n";
            newLastMessageContent += lastMessage.content;
            newLastMessageContent += "\n";
            newLastMessageContent +=
              'Now, as I said, please list by name the resources that are relevant to be able to respond to the that prompt. Or if none are relevant, you should respond with "none are relevant". Do not respond to the prompt at this time.';
            const newLastMessage: ORMessage = {
              role: "user",
              content: newLastMessageContent,
            };
            console.info("USER: ", newLastMessage.content);
            const messages3 = [...messages2.slice(0, -1), newLastMessage];
            const responseMessage1 = await sendChatRequest(
              messages3,
              totalContextString,
              modelName,
            );
            console.info("ASSISTANT: ", responseMessage1);
            const allReferencedResourceDocs: {
              name: string;
              description: string;
              content: string;
            }[] = [];
            for (const doc of allExcludedResourceDocs) {
              if (responseMessage1.includes(doc.name)) {
                allReferencedResourceDocs.push(doc);
              }
            }
            if (allReferencedResourceDocs.length > 0) {
              const xx = `Loading ${allReferencedResourceDocs.map((x) => x.name).join(", ")}`;
              setIncludedResourceDocs((prev) => [
                ...prev,
                ...allReferencedResourceDocs.map((x) => x.name),
              ]);
              setMessages((prev) => [
                ...prev,
                { role: "client-side-only", content: xx },
              ]);
              // timeout to get the UI to update from the state change
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          } else if (pass === 2) {
            console.info("");
            console.info("CONTEXT: ", totalContextString);
            const responseMessage2 = await sendChatRequest(
              messages2,
              totalContextString,
              modelName,
            );
            console.info("ASSISTANT: ", responseMessage2);

            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: responseMessage2 },
            ]);
          }
        }
      })();
    }
  }, [messages, contextItems, includedResourceDocs, modelName]);

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

  const initialMessage = useMemo(() => {
    if (route.page === "dandi") {
      return `You can me questions about Neurosift.`;
    } else if (route.page === "dandiset") {
      return "You can ask me questions about Neurosift or this Dandiset.";
    } else if (route.page === "nwb") {
      return "You can ask me questions about Neurosift or this NWB file.";
    } else {
      return "You can ask me questions about Neurosift.";
    }
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
          userSelect: "none",
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
      {position !== "full" && (
        <div
          className="maximize-button"
          style={{
            position: "absolute",
            width: topBarHeight,
            height: topBarHeight,
            top: -3,
            left: width - 60,
          }}
        >
          <SmallIconButton
            icon={<FaWindowMaximize />}
            onClick={() => {
              onSetPosition("full");
            }}
            title="Maximize window"
          />
        </div>
      )}
      {position === "full" && (
        <div
          className="restore-button"
          style={{
            position: "absolute",
            width: topBarHeight,
            height: topBarHeight,
            top: -3,
            left: width - 60,
          }}
        >
          <SmallIconButton
            icon={<FaWindowRestore />}
            onClick={() => onSetPosition("bottom-left")}
            title="Restore window"
          />
        </div>
      )}
      <div
        className="close-button"
        style={{
          position: "absolute",
          width: topBarHeight,
          height: topBarHeight,
          top: -3,
          left: width - 30,
        }}
      >
        <SmallIconButton
          icon={<Close />}
          onClick={onClose}
          title="Close window"
        />
      </div>

      <div
        ref={chatContainerRef}
        style={{
          position: "absolute",
          left: 5,
          width: width - 10,
          top: topBarHeight,
          height: height - topBarHeight - inputBarHeight - settingsBarHeight,
          overflow: "auto",
        }}
      >
        <span style={{ color: "black" }}>
          <Markdown source={initialMessage} />
        </span>
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
            ) : c.role === "client-side-only" ? (
              <>
                <span style={{ color: "blue" }}>{c.content}</span>
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
      &nbsp;
      <select value={modelName} onChange={(e) => setModelName(e.target.value)}>
        {modelOptions.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      &nbsp;
      <SmallIconButton
        icon={<Cancel />}
        onClick={() => {
          onClearAllMessages();
        }}
        title="Clear all messages"
      />
      <span>&nbsp;AI chatbots may be inaccurate.</span>
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
    "You are a helpful assistant that provides answers to technical questions.",
  );
  systemLines.push("Avoid lengthy explanations unless specifically asked.");
  systemLines.push(
    // This is required as is in order for the message to be accepted
    "The user is chatting with you in a chat window of software called Neurosift",
  );
  systemLines.push(
    // This is required as is in order for the message to be accepted
    "You should stick to answering questions related to the software and its usage as well as the data being analyzed and visualized.",
  );
  systemLines.push(
    "In your answer you can reference the following external resourcs as relevant. Reference them as markdown links.",
  );
  systemLines.push(
    "[Overview of Neurosift](https://github.com/flatironinstitute/neurosift)",
  );
  systemLines.push(
    "[Neurodata types supported in Neurosift](https://github.com/flatironinstitute/neurosift/blob/main/doc/neurodata_types.md)",
  );
  systemLines.push(
    "[Workshop: Exploring and Analyzing NWB Datasets on DANDI with Neurosift and Dendro](https://github.com/flatironinstitute/neurosift/blob/main/doc/neurosift_dendro_MIT_workshop_sep_2024.md)",
  );

  systemLines.push(`
Neurosift is a browser-based tool designed for the visualization of NWB (Neurodata Without Borders) files, whether stored locally or hosted remotely, and enables interactive exploration of the DANDI Archive.
`);

  const systemMessage: ORMessage = {
    role: "system",
    content: systemLines.join("\n") + "\n" + contextString,
  };
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

type ContextItem = {
  content: string;
  resourceDocs?: { name: string; description: string; content: string }[];
};

type ContextChatContextValue = {
  contextItems: { [key: string]: ContextItem };
  setContextItem: (key: string, value: ContextItem | undefined) => void;
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
  const [contextItems, setContextItems] = useState<{
    [key: string]: ContextItem;
  }>({});
  const setContextItem = useCallback(
    (key: string, v: ContextItem | undefined) => {
      setContextItems((prev) => {
        if (!v) {
          if (!prev[key]) return prev;
          const new_prev = { ...prev };
          delete new_prev[key];
          return new_prev;
        }
        return { ...prev, [key]: v };
      });
    },
    [],
  );
  return (
    <ContextChatContext.Provider value={{ contextItems, setContextItem }}>
      {children}
    </ContextChatContext.Provider>
  );
};

export default ContextChat;
