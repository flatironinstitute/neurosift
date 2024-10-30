import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, ForkLeft, Send } from "@mui/icons-material";
import Markdown from "app/Markdown/Markdown";
import {
  ORMessage,
  ORTool,
} from "app/pages/DandisetPage/DandisetViewFromDendro/openRouterTypes";
import useRoute from "app/useRoute";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { fetchNeurodataTypesIndex } from "../DandiQueryPage/SearchByNeurodataTypeWindow";
import {
  computeEmbeddingForAbstractText,
  findSimilarDandisetIds,
  loadEmbeddings,
} from "../DandisetPage/DandisetViewFromDendro/SimilarDandisetsView";
import chatCompletion from "./chatCompletion";
import { probeDandisetTool } from "./tools/probeDandiset";
import { dandisetObjectsTool } from "./tools/probeDandisetObjects";
import { neurodataTypesTool } from "./tools/probeNeurodataTypes";
import { unitsColnamesTool } from "./tools/probeUnitsColnames";
import { relevantDandisetsTool } from "./tools/relevantDandisets";
import { lexicaltDandisetsTool } from "./tools/lexicalDandisets";
import { timeseriesAlignmentViewTool } from "./tools/timeseriesAlignmentView";

export type Chat = {
  messages: (ORMessage | { role: "client-side-only"; content: string })[];
};

export const emptyChat: Chat = {
  messages: [],
};

type ChatWindowProps = {
  width: number;
  height: number;
  chat: Chat;
  setChat: (chat: Chat) => void;
  openRouterKey: string | null;
  onLogMessage: (title: string, message: string) => void;
  additionalKnowledge: string;
  onToggleLeftPanel?: () => void;
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

export type ToolItem = {
  function: (
    args: any,
    onLogMessage: (title: string, message: string) => void,
    o: {
      modelName: string;
      openRouterKey: string | null;
    },
  ) => Promise<any>;
  detailedDescription?: string;
  tool: ORTool;
};

const ChatWindow: FunctionComponent<ChatWindowProps> = ({
  width,
  height,
  chat,
  setChat,
  openRouterKey,
  onLogMessage,
  additionalKnowledge,
  onToggleLeftPanel
}) => {
  const { route, setRoute } = useRoute();
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

  const tools: ToolItem[] = useMemo(() => {
    return [
      relevantDandisetsTool,
      lexicaltDandisetsTool,
      neurodataTypesTool,
      unitsColnamesTool,
      dandisetObjectsTool,
      probeDandisetTool,
      timeseriesAlignmentViewTool,
      // consultTool
    ];
  }, []);

  const systemMessage = useSystemMessage(tools, additionalKnowledge);

  useEffect(() => {
    if (!systemMessage) return;
    // submit user message or tool results
    let canceled = false;
    const messages2: ORMessage[] = [
      {
        role: "system",
        content: systemMessage,
      },
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    const lastMessage = messages2[messages2.length - 1];
    if (!lastMessage) return;
    if (lastMessage.role === "user" || lastMessage.role === "tool") {
      (async () => {
        const { assistantMessage, toolCalls } = await chatCompletion({
          messages: messages2,
          modelName,
          openRouterKey,
          tools: tools.map((x) => x.tool),
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
          const processToolCall = async (tc: any) => {
            const func = tools.find(
              (x) => x.tool.function.name === tc.function.name,
            )?.function;
            if (!func) {
              throw Error(`Unexpected. Did not find tool: ${tc.function.name}`);
            }
            const msg0: { role: "client-side-only"; content: string } = {
              role: "client-side-only",
              content: labelForToolCall(tc) + "...",
            };
            newMessages.push(msg0);
            pendingMessagesDispatch({
              type: "add",
              message: msg0,
            });
            const args = JSON.parse(tc.function.arguments);
            console.info("TOOL CALL: ", tc.function.name, args);
            let response: string;
            try {
              response = await func(args, onLogMessage, {
                modelName,
                openRouterKey,
              });
            } catch (e: any) {
              response = "Error: " + e.message;
            }
            if (canceled) return;
            msg0.content = "✓ " + labelForToolCall(tc);
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
          };
          // run the tool calls in parallel
          await Promise.all(toolCalls.map(processToolCall));
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
    openRouterKey,
    tools,
    onLogMessage,
    systemMessage,
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
    return `I can help you find information about Dandisets in the DANDI Archive.`;
  }, []);

  const inputBarEnabled = useMemo(() => {
    return !lastMessageIsUserOrTool && !lastMessageIsToolCalls;
  }, [lastMessageIsUserOrTool, lastMessageIsToolCalls]);

  const suggestedQuestions = useMemo(() => {
    return ["What questions can I ask?"];
  }, []);

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

  const chatAreaWidth = Math.min(width, 1100);
  const offsetLeft = (width - chatAreaWidth) / 2;

  // when a new message comes, scroll to the bottom
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
    if (!["assistant", "client-side-only"].includes(lastMessage.role)) {
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={{ position: "relative", left: offsetLeft, width: chatAreaWidth, height }}>
      <div
        ref={chatContainerRef}
        style={{
          position: "absolute",
          left: 5,
          width: chatAreaWidth - 10,
          top: topBarHeight,
          height: height - topBarHeight - inputBarHeight - settingsBarHeight,
          overflow: "auto",
        }}
      >
        <div>
          <Markdown source={initialMessage} />
        </div>
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
              {c.role === "assistant" && c.content !== null ? (
                <>
                  <Markdown
                    source={c.content as string}
                    onSpecialLinkClick={handleSpecialLinkClick}
                  />
                </>
              ) : c.role === "user" ? (
                <>
                  <hr />
                  <span style={{color: "darkblue"}}>Q: </span>
                  <span style={{ color: "darkblue" }}>
                    <MessageDisplay message={c.content as string} />
                  </span>
                  <hr />
                </>
              ) : c.role === "client-side-only" ? (
                <>
                  <div style={{ color: "#6a6", paddingBottom: 10 }}>
                    {c.content}
                  </div>
                </>
              ) : (
                <span>Unknown role: {c.role}</span>
              )}
            </div>
          ))}
        {lastMessageIsUserOrTool || lastMessageIsToolCalls ? (
          <div>
            <span style={{ color: "#6a6" }}>...</span>
          </div>
        ) : null}
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
          onToggleLeftPanel={onToggleLeftPanel}
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
  onToggleLeftPanel?: () => void;
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
  onToggleLeftPanel
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
      {
        onToggleLeftPanel && (
          <SmallIconButton
            icon={<ForkLeft />}
            onClick={onToggleLeftPanel}
            title="Toggle left panel"
          />
        )
      }
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

const getSystemMessage = async (
  tools: ToolItem[],
  additionalKnowledge: string,
) => {
  let allNeurodataTypes: string[];
  try {
    allNeurodataTypes = await getAllNeurodataTypes();
  } catch (e) {
    console.warn("Failed to get all neurodata types", e);
    allNeurodataTypes = [];
  }

  let systemMessage = `
You are a helpful assistant that is responding to questions about the DANDI Archive.

You should make use of the tools provided to you to help answer questions.

If the questions are irrelevant or inappropriate, you should respond with a message indicating that you are unable to help with that question.

Whenever you provide a 6-digit Dandiset ID in response to a question you should use markdown notation for a link of the following format

[000409](https://neurosift.app/?p=/dandiset&dandisetId=000409)

where of course the number 000409 is replaced with the actual Dandiset ID.

Within one response, do not make excessive calls to the tools. Maybe up to around 5 is reasonable. But if you want to make more, you could ask the user if they would like you to do more work to find the answer.

Assume that if the user is asking to find Dandisets, they also want to know more about those dandisets and how they are relevant to the user's query. So you should use the probe_dandiset tool for that.

When you use probe_dandiset, try to be specific based on the context. For example, instead of just saying "what's this dandiset about?" say "what's this dandiset about, especially relating to xyz".

If the user is looking for particular types of data, you will want to probe the neurodata types in DANDI by submitting scripts
to the probe_neurodata_types tool.
The possible neurodata types are: ${allNeurodataTypes.join(", ")}.

If the user wants dandisets with particular data type and also other criteria (like a prompt),
then you should first find the dandisets with the data types using the probe_neurodata_types tool,
and then use the relevant_dandisets tool with a restriction to the dandisets found in the previous step.

If the user wants to do a lexical search for dandisets, you can use the lexical_dandisets tool.
The results of lexical_dandisets will be in descending order of modified date, so you can also
use the with an empty search_text to get the most recently modified dandisets.

If the user wants to know about what column names are in units tables for various dandisets, you can use the probe_units_colnames tool.

When you refer to a particular neurodata object (that is in an NWB file within a dandiset), you should use the following link to a visualization

[label](https://neurosift.app/?p=/nwb&url=[download_url]&dandisetId=[dandiset_id]&dandisetVersion=[dandiseet_version]&tab=view:[neurodata_type]|[object_path])

If the user asks for a random example, then use Math.random in the javascript to truly provide a random example... don't just use the first in the list.

For the timeseries_alignment_view, when you get the URL, you should return it as is on a separate line of the response (don't put it in a markdown link), because then the chat interface will render it inline.

When asked about what questions can be asked, you should give a list of your capabilities... and don't deviate from the things you have been specifically told how to do.

${additionalKnowledge}

  `;
  for (const tool of tools) {
    if (tool.detailedDescription) {
      systemMessage += `
========================
Here's a detailed description of the ${tool.tool.function.name} tool:
${tool.detailedDescription}
========================
`;
    }
  }

  // But before you do anything you should use the consult tool one or more times to get information about the topics that the user is asking about.
  // This will help you to understand the context of the user's query and to provide more relevant responses.
  // The possible topics are:
  // - units-tables: This corresponds to the Units neurodata type and contains neural spiking data - usually the output of spike sorting.
  // - behavioral-events: This corresponds to the BehavioralEvents neurodata type and contains data about behavioral events.
  // - optical-physiology: This corresponds to the OpticalPhysiology neurodata type and contains data about optical physiology experiments.

  return systemMessage;
};

const useSystemMessage = (tools: ToolItem[], additionalKnowledge: string) => {
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  useEffect(() => {
    getSystemMessage(tools, additionalKnowledge).then((msg) => {
      setSystemMessage(msg);
    });
  }, [tools, additionalKnowledge]);
  return systemMessage;
};

const getAllNeurodataTypes = async () => {
  const a: any = await fetchNeurodataTypesIndex();
  if (!a) {
    throw new Error("Failed to fetch neurodata types index");
  }
  return a.neurodata_types.map((x: any) => x.neurodata_type);
};

// const topicInfo: { [key: string]: string } = {
//   "units-tables": "Units tables are the boss",
//   "behavioral-events": "Behavioral events are the boss",
//   "optical-physiology": "Optical physiology is the boss",
// };

// const consultTool = {
//   tool: {
//     type: "function" as any,
//     function: {
//       name: "consult",
//       description:
//         "Consult documentation on a topic. The possible topics are: units-tables, behavioral-events, and optical-physiology.",
//       parameters: {
//         type: "object",
//         properties: {
//           topic: {
//             type: "string",
//             description:
//               "The topic to consult. See description for possible values.",
//           },
//         },
//       },
//     },
//   },
//   function: async (
//     args: { topic: string },
//     onLogMessage: (title: string, message: string) => void,
//   ) => {
//     const { topic } = args;
//     onLogMessage("consult query", topic);
//     const ret =
//       topicInfo[topic] || "No information found for the specified topic.";
//     onLogMessage("consult response", ret);
//     return ret;
//   },
// };

export default ChatWindow;
