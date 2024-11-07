import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, Send } from "@mui/icons-material";
import { Markdown } from "neurosift-lib";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import doChatCompletion, {
  allToolFunctions,
  getChatTitleForRoute,
  getSuggestedQuestionsForRoute,
} from "./doChatCompletion";
import useRoute, { Route } from "app/useRoute";
import { useNwbFile, useNwbFileSafe } from "app/pages/NwbPage/NwbFileContext";
import {
  MergedRemoteH5File,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "@remote-h5-file/index";
import { ORMessage } from "app/pages/DandisetPage/DandisetViewFromDendro/openRouterTypes";

export type Chat = {
  messages: (ORMessage | { role: "client-side-only"; content: string })[];
};

export const emptyChat: Chat = {
  messages: [],
};

type ChatPanelProps = {
  width: number;
  height: number;
  chat: Chat;
  setChat: (chat: Chat) => void;
  availableResourceUrls?: string[];
};

type PendingMessages = (
  | ORMessage
  | { role: "client-side-only"; content: string }
)[];

type PendingMessagesAction =
  | {
      type: "add";
      message: ORMessage | { role: "client-side-only"; content: string };
    }
  | {
      type: "clear";
    }
  | {
      type: "replace-last";
      message: ORMessage | { role: "client-side-only"; content: string };
    };

const pendingMesagesReducer = (
  state: PendingMessages,
  action: PendingMessagesAction,
): PendingMessages => {
  if (action.type === "add") {
    return [...state, action.message];
  } else if (action.type === "clear") {
    return [];
  } else if (action.type === "replace-last") {
    if (state.length === 0) {
      return state;
    }
    return [...state.slice(0, state.length - 1), action.message];
  } else {
    return state;
  }
};

const ChatPanel: FunctionComponent<ChatPanelProps> = ({
  width,
  height,
  chat,
  setChat,
  availableResourceUrls,
}) => {
  const { route, setRoute } = useRoute();
  const nwbFile = useNwbFileSafe();
  const inputBarHeight = 30;
  const settingsBarHeight = 20;
  const topBarHeight = 24;

  const [modelName, setModelName] = useState("openai/gpt-4o");

  const handleUserMessage = useCallback(
    (message: string) => {
      setChat({
        messages: [...chat.messages, { role: "user", content: message }],
      });
    },
    [chat, setChat],
  );

  const messages = chat.messages;

  const [pendingMessages, pendingMessagesDispatch] = useReducer(
    pendingMesagesReducer,
    [],
  );

  const lastMessage = useMemo(() => {
    const messages2: ORMessage[] = [
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    if (messages2.length === 0) return null;
    return messages2[messages2.length - 1];
  }, [messages]);

  const lastMessageIsUserOrTool = useMemo(() => {
    return lastMessage
      ? lastMessage.role === "user" || lastMessage.role === "tool"
      : false;
  }, [lastMessage]);

  const lastMessageIsToolCalls = useMemo(() => {
    return lastMessage
      ? !!(
          lastMessage.role === "assistant" &&
          lastMessage.content === null &&
          lastMessage.tool_calls
        )
      : false;
  }, [lastMessage]);

  const [selectedResourceUrls, setSelectedResourceUrls] = useState<string[]>(
    [],
  );

  useEffect(() => {
    // submit user message or tool results
    let canceled = false;
    const messages2: ORMessage[] = [
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    const lastMessage = messages2[messages2.length - 1];
    if (!lastMessage) return;
    if (lastMessage.role === "user" || lastMessage.role === "tool") {
      (async () => {
        const { nwbFileUrl, urlType } = getNwbFileUrlAndType(nwbFile);
        const resourceUrls = (availableResourceUrls || []).filter((url) =>
          selectedResourceUrls.includes(url),
        );
        const { assistantMessage, toolCalls } = await doChatCompletion({
          messages: messages2,
          modelName,
          route,
          nwbFileUrl,
          urlType,
          resourceUrls,
        });
        if (canceled) return;
        if (!toolCalls) {
          setChat({
            messages: [
              ...messages,
              { role: "assistant", content: assistantMessage },
            ],
          });
        } else {
          // tool calls
          if (assistantMessage) {
            console.warn(
              "Unexpected: assistant message and tool calls. Ignoring assistant message.",
            );
          }
          const newMessages: (
            | ORMessage
            | { role: "client-side-only"; content: string }
          )[] = [];
          const msg: ORMessage = {
            role: "assistant",
            content: null,
            tool_calls: toolCalls,
          };
          newMessages.push(msg);
          pendingMessagesDispatch({
            type: "add",
            message: msg,
          });
          // todo: do the tool calls here, instead of below, accumulate pending messages, and then set them all at once
          for (const tc of toolCalls) {
            const func = allToolFunctions[tc.function.name];
            if (!func) {
              throw Error(`Unexpected. Did not find tool: ${tc.function.name}`);
            }
            const msg0: { role: "client-side-only"; content: string } = {
              role: "client-side-only",
              content: "calling " + labelForToolCall(tc) + "...",
            };
            newMessages.push(msg0);
            pendingMessagesDispatch({
              type: "add",
              message: msg0,
            });
            const args = JSON.parse(tc.function.arguments);
            console.info("TOOL CALL: ", tc.function.name, args);
            const response = await func(args);
            if (canceled) return;
            msg0.content = "called " + labelForToolCall(tc);
            pendingMessagesDispatch({
              type: "replace-last",
              message: msg0,
            });
            console.info("TOOL RESPONSE: ", response);
            const msg1: ORMessage = {
              role: "tool",
              content: JSON.stringify(response),
              tool_call_id: tc.id,
            };
            newMessages.push(msg1);
            pendingMessagesDispatch({
              type: "add",
              message: msg1,
            });
          }
          setChat({
            messages: [...messages, ...newMessages],
          });
          pendingMessagesDispatch({
            type: "clear",
          });
        }
      })();
    }
    return () => {
      canceled = true;
    };
  }, [
    messages,
    modelName,
    route,
    setChat,
    nwbFile,
    availableResourceUrls,
    selectedResourceUrls,
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleClearAllMessages = useCallback(() => {
    setChat({
      messages: [],
    });
  }, [setChat]);

  const handleSpecialLinkClick = useCallback(
    (link: string) => {
      console.info("Special link clicked:", link);
      if (link.startsWith("?")) {
        const parts = link.slice(1).split("&");
        const params: { [key: string]: string } = {};
        for (const part of parts) {
          const vv = part.split("=");
          if (vv.length === 2) {
            params[vv[0]] = vv[1];
          }
        }
        if (params.page === "dandiset" && params.dandisetId) {
          setRoute({ page: "dandiset", dandisetId: params.dandisetId });
        }
      }
    },
    [setRoute],
  );

  const initialMessage = useMemo(() => {
    return getChatTitleForRoute(route);
  }, [route]);

  const inputBarEnabled = useMemo(() => {
    return !lastMessageIsUserOrTool && !lastMessageIsToolCalls;
  }, [lastMessageIsUserOrTool, lastMessageIsToolCalls]);

  const suggestedQuestions = useMemo(() => {
    return getSuggestedQuestionsForRoute(route);
  }, [route]);

  const handleClickSuggestedQuestion = useCallback(
    (question: string) => {
      if (!inputBarEnabled) {
        return;
      }
      setChat({
        messages: [...messages, { role: "user", content: question }],
      });
    },
    [messages, setChat, inputBarEnabled],
  );

  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{
          position: "absolute",
          width,
          height: topBarHeight,
          top: 0,
          left: 0,
          backgroundColor: "#eee",
          fontSize: 12,
        }}
      >
        <div style={{ marginTop: 6, marginLeft: 5 }}>{initialMessage}</div>
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
        {(availableResourceUrls || []).map((url) => (
          <div key={url}>
            <ResourceUrlSelectComponent
              selected={selectedResourceUrls.includes(url)}
              url={url}
              setSelected={(selected) => {
                if (selected) {
                  setSelectedResourceUrls([...selectedResourceUrls, url]);
                } else {
                  setSelectedResourceUrls(
                    selectedResourceUrls.filter((x) => x !== url),
                  );
                }
              }}
            />
          </div>
        ))}
        {suggestedQuestions.length > 0 && (
          <div style={{ marginTop: 5, marginBottom: 5 }}>
            {suggestedQuestions.map((question, index) => (
              <span key={index}>
                {index > 0 && <br />}
                <span
                  style={{
                    marginLeft: 5,
                    marginRight: 5,
                    cursor: inputBarEnabled ? "pointer" : undefined,
                    color: inputBarEnabled ? "#aaf" : "lightgray",
                  }}
                  onClick={() => handleClickSuggestedQuestion(question)}
                >
                  {question}
                </span>
              </span>
            ))}
          </div>
        )}
        {[...messages, ...pendingMessages]
          .filter((m) => {
            if (m.role === "tool") {
              return false;
            }
            if (m.role === "assistant" && m.content === null) {
              return false;
            }
            return true;
          })
          .map((c, index) => (
            <div
              key={index}
              ref={index === messages.length - 1 ? lastMessageRef : null}
              style={{
                color: colorForString(c.role),
              }}
            >
              <hr />
              {c.role === "assistant" && c.content !== null ? (
                <>
                  <Markdown
                    source={c.content as string}
                    onSpecialLinkClick={handleSpecialLinkClick}
                  />
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
                  <span style={{ color: "#6a6" }}>{c.content}</span>
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
          disabled={!inputBarEnabled}
          waitingForResponse={lastMessageIsUserOrTool || lastMessageIsToolCalls}
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
  const [messageText, setMessageText] = useState("");
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "NumpadEnter" || e.key === "Return") {
        // not sure about this
        if (messageText.length > 1000) {
          alert("Message is too long");
          return;
        }
        onMessage(messageText);
        setMessageText("");
      }
    },
    [messageText, onMessage],
  );
  return (
    <div style={{ position: "absolute", width, height }}>
      <input
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        style={{ width: width - 8 - 20, height: height - 7 }}
        onKeyDown={handleKeyDown}
        placeholder={
          waitingForResponse ? "Waiting for response..." : "Type a message..."
        }
        disabled={disabled}
      />
      <span style={{ position: "relative", top: "-5px" }}>
        <SmallIconButton
          icon={<Send />}
          title="Submit"
          onClick={() => {
            if (messageText.length > 1000) {
              alert("Message is too long");
              return;
            }
            onMessage(messageText);
            setMessageText("");
          }}
        />
      </span>
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
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-haiku",
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
      <span>&nbsp;AI can be inaccurate.</span>
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

const getNwbFileUrlAndType = (nwbFile: RemoteH5FileX | null) => {
  if (!nwbFile) {
    return { nwbFileUrl: undefined, urlType: undefined };
  }
  let nwbFileUrl: string;
  let urlType: "hdf5" | "lindi";
  if (nwbFile instanceof MergedRemoteH5File) {
    const f = nwbFile.getFiles()[0];
    if (f instanceof RemoteH5FileLindi) {
      nwbFileUrl = f.url;
      urlType = "lindi";
    } else if (f instanceof RemoteH5File) {
      nwbFileUrl = f.url;
      urlType = "hdf5";
    } else {
      nwbFileUrl = "unknown";
      urlType = "hdf5";
    }
  } else {
    if (nwbFile instanceof RemoteH5FileLindi) {
      nwbFileUrl = nwbFile.url;
      urlType = "lindi";
    } else {
      nwbFileUrl = nwbFile.url;
      urlType = "hdf5";
    }
  }
  return { nwbFileUrl, urlType };
};

type ResourceUrlSelectComponentProps = {
  url: string;
  selected: boolean;
  setSelected: (selected: boolean) => void;
};

const ResourceUrlSelectComponent: FunctionComponent<
  ResourceUrlSelectComponentProps
> = ({ url, selected, setSelected }) => {
  return (
    <div>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => setSelected(e.target.checked)}
      />
      <span>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </span>
    </div>
  );
};

const labelForToolCall = (tc: {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}) => {
  const functionName = tc.function.name;
  if (functionName === "load_external_resource") {
    const args = JSON.parse(tc.function.arguments);
    const arg = args.url || "";
    return `load_external_resource ${arg}`;
  } else {
    return tc.function.name;
  }
};

export default ChatPanel;
