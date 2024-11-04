import { SmallIconButton } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { Cancel, Check, ForkLeft, Save, Send } from "@mui/icons-material";
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
import {
  FaBrain,
  FaEnvelope,
  FaRegThumbsDown,
  FaRegThumbsUp,
} from "react-icons/fa";
import chatCompletion from "./chatCompletion";
import FeedbackWindow from "./FeedbackWindow";
import SaveChatDialog from "./SaveChatDialog";
import { lexicaltDandisetsTool } from "./tools/lexicalDandisets";
import { probeDandisetTool } from "./tools/probeDandiset";
import { dandisetObjectsTool } from "./tools/probeDandisetObjects";
import { neurodataTypesTool } from "./tools/probeNeurodataTypes";
import { probeNwbFileTool } from "./tools/probeNwbFile";
import { unitsColnamesTool } from "./tools/probeUnitsColnames";
import { relevantDandisetsTool } from "./tools/relevantDandisets";
import { timeseriesAlignmentViewTool } from "./tools/timeseriesAlignmentView";
import Splitter from "app/Splitter/Splitter";
import RunCodeWindow, {
  PythonSessionStatus,
  RunCodeCommunicator,
} from "./RunCodeWindow";
import { ExecuteScript, generateFigureTool } from "./tools/generateFigure";
import PythonSessionClient from "./PythonSessionClient";

export type Chat = {
  messages: (
    | ORMessage
    | { role: "client-side-only"; content: string; color?: string }
  )[];
};

export const emptyChat: Chat = {
  messages: [],
};

export type ChatContext =
  | {
      type: "main";
    }
  | {
      type: "dandiset";
      dandisetId: string;
    }
  | {
      type: "nwb";
      dandisetId?: string;
      nwbUrl: string;
    };

type ChatWindowProps = {
  width: number;
  height: number;
  chat: Chat;
  setChat: (chat: Chat) => void;
  openRouterKey: string | null;
  onLogMessage: (title: string, message: string) => void;
  onToggleLeftPanel?: () => void;
  chatContext: ChatContext;
};

type PendingMessages = (
  | ORMessage
  | { role: "client-side-only"; content: string; color?: string }
)[];

type PendingMessagesAction =
  | {
      type: "add";
      message:
        | ORMessage
        | { role: "client-side-only"; content: string; color?: string };
    }
  | {
      type: "clear";
    }
  | {
      type: "replace-last";
      message:
        | ORMessage
        | { role: "client-side-only"; content: string; color?: string };
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
      executeScript?: ExecuteScript;
      onAddImage?: (name: string, url: string) => void;
      onStdout?: (message: string) => void;
      onStderr?: (message: string) => void;
      confirmOkayToRun?: (script: string) => Promise<boolean>;
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
  onToggleLeftPanel,
  chatContext,
}) => {
  const [showRunCodeWindow, setShowRunCodeWindow] = useState(false);
  const [pythonSessionStatus, setPythonSessionStatus] =
    useState<PythonSessionStatus>("uninitiated");
  const runCodeCommunicator = useMemo(() => new RunCodeCommunicator(), []);
  useEffect(() => {
    runCodeCommunicator.onPythonSessionStatusChanged((status) => {
      if (status === "busy") {
        setShowRunCodeWindow(true);
      }
    });
  }, [runCodeCommunicator]);
  useEffect(() => {
    setPythonSessionStatus(runCodeCommunicator.pythonSessionStatus);
    const onChange = (status: PythonSessionStatus) => {
      setPythonSessionStatus(status);
    };
    runCodeCommunicator.onPythonSessionStatusChanged(onChange);
    return () => {
      runCodeCommunicator.removeOnPythonSessionStatusChanged(onChange);
    };
  }, [runCodeCommunicator]);
  const handleRunCode = useCallback(
    async (code: string) => {
      setShowRunCodeWindow(true);
      runCodeCommunicator.runCode(code, {
        onStdout: (message) => {
          //
        },
        onStderr: (message) => {
          //
        },
        onImage: (format, content) => {
          //
        },
      });
    },
    [runCodeCommunicator],
  );
  const executeScript: ExecuteScript = useCallback(
    async (
      script: string,
      o: {
        onStdout?: (message: string) => void;
        onStderr?: (message: string) => void;
        onImage?: (format: "png", content: string) => void;
      },
    ) => {
      const { onStdout, onStderr, onImage } = o;
      await runCodeCommunicator.runCode(script, {
        onStdout,
        onStderr,
        onImage,
      });
    },
    [runCodeCommunicator],
  );
  return (
    <Splitter
      width={width}
      height={height}
      initialPosition={width / 2}
      hideSecondChild={!showRunCodeWindow}
    >
      <MainChatWindow
        width={0}
        height={0}
        chat={chat}
        setChat={setChat}
        openRouterKey={openRouterKey}
        onLogMessage={onLogMessage}
        onToggleLeftPanel={onToggleLeftPanel}
        chatContext={chatContext}
        onRunCode={handleRunCode}
        pythonSessionStatus={pythonSessionStatus}
        executeScript={executeScript}
      />
      <RunCodeWindow
        width={0}
        height={0}
        runCodeCommunicator={runCodeCommunicator}
      />
    </Splitter>
  );
};

type ImagesState = {
  name: string;
  dataUrl: string;
}[];

type ImagesAction = {
  type: "add";
  name: string;
  dataUrl: string;
};

const imagesReducer = (
  state: ImagesState,
  action: ImagesAction,
): ImagesState => {
  if (action.type === "add") {
    return [...state, { name: action.name, dataUrl: action.dataUrl }];
  } else {
    return state;
  }
};

type CompletionProgressMessage = {
  type: "stdout" | "stderr";
  message: string;
};

const MainChatWindow: FunctionComponent<
  ChatWindowProps & {
    onRunCode: (code: string) => void;
    pythonSessionStatus: PythonSessionStatus;
    executeScript: ExecuteScript;
  }
> = ({
  width,
  height,
  chat,
  setChat,
  openRouterKey,
  onLogMessage,
  onToggleLeftPanel,
  chatContext,
  onRunCode,
  pythonSessionStatus,
  executeScript,
}) => {
  const { route, setRoute } = useRoute();
  const inputBarHeight = 30;
  const settingsBarHeight = 20;
  const topBarHeight = 24;

  const [modelName, setModelName] = useState("openai/gpt-4o");

  const [images, imagesDispatch] = useReducer(imagesReducer, []);

  const handleUserMessage = useCallback(
    (message: string) => {
      setChat({
        messages: [...chat.messages, { role: "user", content: message }],
      });
      setAtLeastOneUserMessageSubmitted(true);
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

  const lastMessageIsAssistant = useMemo(() => {
    return lastMessage ? lastMessage.role === "assistant" : false;
  }, [lastMessage]);

  const tools: ToolItem[] = useMemo(() => {
    const ret: ToolItem[] = [];
    if (["main"].includes(chatContext.type)) {
      ret.push(relevantDandisetsTool);
      ret.push(lexicaltDandisetsTool);
      ret.push(unitsColnamesTool);
    }
    if (["main", "dandiset"].includes(chatContext.type)) {
      ret.push(dandisetObjectsTool);
      ret.push(neurodataTypesTool);
    }
    if (["main", "dandiset", "nwb"].includes(chatContext.type)) {
      ret.push(probeDandisetTool);
      ret.push(timeseriesAlignmentViewTool);
      ret.push(probeNwbFileTool);
      ret.push(generateFigureTool);
    }
    return ret;
  }, [chatContext]);

  const [additionalKnowledge, setAdditionalKnowledge] = useState("");
  usePersistAdditionalKnowledge(additionalKnowledge, setAdditionalKnowledge);

  const systemMessage = useSystemMessage(
    tools,
    chatContext,
    additionalKnowledge,
  );

  const {
    handleOpen: openSaveChat,
    handleClose: closeSaveChat,
    visible: saveChatVisible,
  } = useModalWindow();

  const [editedPromptText, setEditedPromptText] = useState("");

  const backUpAndEraseLastUserMessage = useCallback(() => {
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }
    if (lastUserMessageIndex === -1) {
      return;
    }
    const lastUserMessageContent = messages[lastUserMessageIndex].content;
    const newMessages = messages.slice(0, lastUserMessageIndex);
    setChat({
      messages: newMessages,
    });
    if (typeof lastUserMessageContent === "string") {
      setEditedPromptText(lastUserMessageContent);
    }
  }, [messages, setChat]);

  const [completionProgress, setCompletionProgress] = useState<
    CompletionProgressMessage[]
  >([]);
  const resetCompletionProgress = useCallback(() => {
    setCompletionProgress([]);
  }, []);
  const addCompletionProgressMessage = useCallback(
    (type: "stdout" | "stderr", message: string) => {
      setCompletionProgress((prev) => [
        ...prev,
        {
          type,
          message,
        },
      ]);
    },
    [],
  );

  const {
    visible: confirmOkayToRunVisible,
    handleOpen: openConfirmOkayToRun,
    handleClose: closeConfirmOkayToRun,
  } = useModalWindow();
  const confirmOkayToRunStatus = useRef<
    "none" | "waiting" | "confirmed" | "canceled"
  >("none");
  const [confirmOkayToRunScript, setConfirmOkayToRunScript] = useState<
    string | null
  >(null);
  const confirmOkayToRun = useMemo(
    () => async (script: string) => {
      confirmOkayToRunStatus.current = "waiting";
      setConfirmOkayToRunScript(script);
      openConfirmOkayToRun();
      return new Promise<boolean>((resolve) => {
        const interval = setInterval(() => {
          if (confirmOkayToRunStatus.current === "confirmed") {
            confirmOkayToRunStatus.current = "none";
            clearInterval(interval);
            resolve(true);
          } else if (confirmOkayToRunStatus.current === "canceled") {
            confirmOkayToRunStatus.current = "none";
            clearInterval(interval);
            resolve(false);
          }
        }, 100);
      });
    },
    [openConfirmOkayToRun],
  );

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
        let assistantMessage: string;
        let toolCalls: any[] | undefined;
        try {
          const x = await chatCompletion({
            messages: messages2,
            modelName,
            openRouterKey,
            tools: tools.map((x) => x.tool),
          });
          assistantMessage = x.assistantMessage;
          toolCalls = x.toolCalls;
        } catch (e: any) {
          if (canceled) return;
          console.warn("Error in chat completion", e);
          alert("An error occurred in chat completion: " + e.message);
          backUpAndEraseLastUserMessage();
          return;
        }
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
            | { role: "client-side-only"; content: string; color?: string }
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
            const msg0: {
              role: "client-side-only";
              content: string;
              color?: string;
            } = {
              role: "client-side-only",
              content: labelForToolCall(tc) + "...",
              color: "#6a6",
            };
            newMessages.push(msg0);
            pendingMessagesDispatch({
              type: "add",
              message: msg0,
            });
            const args = JSON.parse(tc.function.arguments);
            console.info("TOOL CALL: ", tc.function.name, args);
            const executeScript2: ExecuteScript = async (
              script: string,
              o: {
                onStdout?: (message: string) => void;
                onStderr?: (message: string) => void;
                onImage?: (format: "png", content: string) => void;
              },
            ) => {
              const pythonSessionClient = new PythonSessionClient();
              pythonSessionClient.onOutputItem((item) => {
                if (item.type === "stdout") {
                  o.onStdout && o.onStdout(item.content);
                } else if (item.type === "stderr") {
                  o.onStderr && o.onStderr(item.content);
                } else if (item.type === "image") {
                  o.onImage && o.onImage(item.format, item.content);
                }
              });
              await pythonSessionClient.initiate();
              await pythonSessionClient.requestRunCode(script);
              // wait until idle
              while (pythonSessionClient.pythonSessionStatus !== "idle") {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            };
            let response: string;
            let errorMessage: string | undefined;
            try {
              resetCompletionProgress();
              addCompletionProgressMessage("stdout", "Running tool...");
              response = await func(args, onLogMessage, {
                modelName,
                openRouterKey,
                executeScript: executeScript2,
                onStdout: (message) => {
                  addCompletionProgressMessage("stdout", message);
                },
                onStderr: (message) => {
                  addCompletionProgressMessage("stderr", message);
                },
                onAddImage: (name, url) => {
                  imagesDispatch({
                    type: "add",
                    name,
                    dataUrl: url,
                  });
                },
                confirmOkayToRun,
              });
            } catch (e: any) {
              errorMessage = e.message;
              response = "Error: " + e.message;
            } finally {
              resetCompletionProgress();
            }
            if (canceled) return;
            if (errorMessage === undefined) {
              msg0.content = "✓ " + labelForToolCall(tc);
            } else {
              msg0.content = "✗ " + labelForToolCall(tc) + ": " + errorMessage;
              msg0.color = "#a66";
            }
            pendingMessagesDispatch({
              type: "replace-last",
              message: msg0,
            });
            console.info("TOOL RESPONSE: ", response);
            const msg1: ORMessage = {
              role: "tool",
              content:
                typeof response === "object"
                  ? JSON.stringify(response)
                  : `${response}`,
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
    backUpAndEraseLastUserMessage,
    executeScript,
    addCompletionProgressMessage,
    resetCompletionProgress,
    confirmOkayToRun,
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);
  const [atLeastOneUserMessageSubmitted, setAtLeastOneUserMessageSubmitted] =
    useState(false);

  // useEffect(() => {
  //   if (!atLeastOneUserMessageSubmitted) return;
  //   if (lastMessageRef.current) {
  //     lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [messages, atLeastOneUserMessageSubmitted]);

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
    if (chatContext.type === "main") {
      return `Neurosift chat`;
    } else if (chatContext.type === "dandiset") {
      return `I can help you find information about Dandiset ${chatContext.dandisetId}.`;
    } else if (chatContext.type === "nwb") {
      return `I can help you with this NWB file.`;
    } else {
      return "";
    }
  }, [chatContext]);

  const inputBarEnabled = useMemo(() => {
    return !lastMessageIsUserOrTool && !lastMessageIsToolCalls;
  }, [lastMessageIsUserOrTool, lastMessageIsToolCalls]);

  const suggestedQuestions = useMemo(() => {
    if (chatContext.type === "main") {
      return ["What can you help with?"];
    } else if (chatContext.type === "dandiset") {
      return [
        "Provide an overview of this Dandiset",
        "What are the Neurodata types in this Dandiset?",
        "What can you help with?",
      ];
    } else if (chatContext.type === "nwb") {
      return ["Provide an overview of this file", "What can you help with?"];
    } else {
      return [];
    }
  }, [chatContext]);

  const handleClickSuggestedQuestion = useCallback(
    (question: string) => {
      if (!inputBarEnabled) {
        return;
      }
      setChat({
        messages: [...messages, { role: "user", content: question }],
      });
      setAtLeastOneUserMessageSubmitted(true);
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
    if (!atLeastOneUserMessageSubmitted) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
    if (!["assistant", "client-side-only"].includes(lastMessage.role)) {
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, atLeastOneUserMessageSubmitted]);

  const {
    handleOpen: openFeedbackWindow,
    handleClose: closeFeedbackWindow,
    visible: feedbackWindowVisible,
  } = useModalWindow();
  const [feedbackResponse, setFeedbackResponse] = useState<
    "helpful" | "unhelpful" | "neutral"
  >("helpful");

  const {
    visible: additionalKnowledgeVisible,
    handleOpen: openAdditionalKnowledge,
    handleClose: closeAdditionalKnowledge,
  } = useModalWindow();

  const truncateAtMessage = useCallback(
    (m: ORMessage) => {
      const index = messages.indexOf(m);
      if (index < 0) return;
      setChat({
        messages: messages.slice(0, index),
      });
    },
    [messages, setChat],
  );

  return (
    <div
      style={{
        position: "relative",
        left: offsetLeft,
        width: chatAreaWidth,
        height,
      }}
    >
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
                    marginLeft: 0,
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
              style={{
                color: colorForString(c.role),
              }}
            >
              {c.role === "assistant" && c.content !== null ? (
                <>
                  <Markdown
                    source={c.content as string}
                    onSpecialLinkClick={handleSpecialLinkClick}
                    onRunCode={onRunCode}
                    runCodeReady={
                      pythonSessionStatus === "idle" ||
                      pythonSessionStatus === "uninitiated"
                    }
                    images={images}
                  />
                </>
              ) : c.role === "user" ? (
                <>
                  <hr />
                  <span style={{ color: "darkblue" }}>Q: </span>
                  <span style={{ color: "darkblue" }}>
                    <MessageDisplay message={c.content as string} />
                    &nbsp;
                    <SmallIconButton
                      onClick={() => {
                        const ok = confirm(
                          "Delete this prompt and all subsequent messages?",
                        );
                        if (!ok) return;
                        truncateAtMessage(c);
                      }}
                      icon={<span>...</span>}
                      title="Delete this prompt"
                    />
                  </span>
                  <hr />
                </>
              ) : c.role === "client-side-only" ? (
                <>
                  <div style={{ color: c.color || "#6a6", paddingBottom: 10 }}>
                    {c.content}
                  </div>
                </>
              ) : (
                <span>Unknown role: {c.role}</span>
              )}
            </div>
          ))}
        {(lastMessageIsUserOrTool || lastMessageIsToolCalls) && (
          <div>
            <span style={{ color: "#6a6" }}>...</span>
          </div>
        )}
        {lastMessageIsAssistant && (
          <HelpfulUnhelpfulButtons
            onClick={(response) => {
              setFeedbackResponse(response);
              openFeedbackWindow();
            }}
          />
        )}
        {completionProgress.length > 0 && (
          <CompletionProgressWindow
            width={chatAreaWidth - 10}
            height={400}
            completionProgress={completionProgress}
          />
        )}
        <div ref={bottomElementRef}>&nbsp;</div>
      </div>
      <div
        style={{
          position: "absolute",
          width: chatAreaWidth,
          height: inputBarHeight,
          top: height - inputBarHeight - settingsBarHeight,
          left: 0,
        }}
      >
        <InputBar
          width={chatAreaWidth}
          height={inputBarHeight}
          onMessage={handleUserMessage}
          disabled={!inputBarEnabled}
          waitingForResponse={lastMessageIsUserOrTool || lastMessageIsToolCalls}
          editedPromptText={editedPromptText}
          setEditedPromptText={setEditedPromptText}
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
          onSaveChat={openSaveChat}
          onOpenAdditionalKnowledge={openAdditionalKnowledge}
        />
      </div>
      <ModalWindow visible={saveChatVisible} onClose={closeSaveChat}>
        <SaveChatDialog
          chat={chat}
          onClose={closeSaveChat}
          openRouterKey={openRouterKey}
          chatContext={chatContext}
          images={images}
        />
      </ModalWindow>
      <ModalWindow
        visible={feedbackWindowVisible}
        onClose={closeFeedbackWindow}
      >
        <FeedbackWindow
          chat={chat}
          onClose={closeFeedbackWindow}
          response={feedbackResponse}
          openRouterKey={openRouterKey}
          chatContext={chatContext}
          images={images}
        />
      </ModalWindow>
      <ModalWindow
        visible={additionalKnowledgeVisible}
        onClose={closeAdditionalKnowledge}
      >
        <EditAdditionalKnowledge
          additionalKnowledge={additionalKnowledge}
          setAdditionalKnowledge={setAdditionalKnowledge}
        />
      </ModalWindow>
      <ModalWindow
        visible={confirmOkayToRunVisible}
        onClose={() => {
          confirmOkayToRunStatus.current = "canceled";
          closeConfirmOkayToRun();
        }}
      >
        <ConfirmOkayToRunWindow
          script={confirmOkayToRunScript}
          onConfirm={() => {
            confirmOkayToRunStatus.current = "confirmed";
            closeConfirmOkayToRun();
          }}
          onCancel={() => {
            confirmOkayToRunStatus.current = "canceled";
            closeConfirmOkayToRun();
          }}
        />
      </ModalWindow>
    </div>
  );
};

type InputBarProps = {
  width: number;
  height: number;
  onMessage: (message: string) => void;
  disabled?: boolean;
  waitingForResponse?: boolean;
  editedPromptText: string;
  setEditedPromptText: (text: string) => void;
};

const InputBar: FunctionComponent<InputBarProps> = ({
  width,
  height,
  onMessage,
  disabled,
  waitingForResponse,
  editedPromptText,
  setEditedPromptText,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "NumpadEnter" || e.key === "Return") {
        // not sure about this
        if (editedPromptText.length > 1000) {
          alert("Message is too long");
          return;
        }
        onMessage(editedPromptText);
        setEditedPromptText("");
      }
    },
    [editedPromptText, onMessage, setEditedPromptText],
  );
  return (
    <div style={{ position: "absolute", width, height }}>
      <input
        value={editedPromptText}
        onChange={(e) => setEditedPromptText(e.target.value)}
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
            if (editedPromptText.length > 1000) {
              alert("Message is too long");
              return;
            }
            onMessage(editedPromptText);
            setEditedPromptText("");
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
  onSaveChat?: () => void;
  onOpenAdditionalKnowledge?: () => void;
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
  onToggleLeftPanel,
  onSaveChat,
  onOpenAdditionalKnowledge,
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
      {onToggleLeftPanel && (
        <SmallIconButton
          icon={<ForkLeft />}
          onClick={onToggleLeftPanel}
          title="Toggle left panel"
        />
      )}
      {onSaveChat && (
        <SmallIconButton
          icon={<Save />}
          onClick={onSaveChat}
          title="Save chat"
        />
      )}
      &nbsp;
      {onOpenAdditionalKnowledge && (
        <SmallIconButton
          icon={<FaBrain />}
          onClick={onOpenAdditionalKnowledge}
          title="Edit additional knowledge"
        />
      )}
      <span>&nbsp;&nbsp;AI can be inaccurate.</span>
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

const pynwbTips = `
NOTE: Here are some tips for working with pynwb:

Here's how you can load a stimulus template image using pynwb:
Suppose you have a stimulus template at
/stimulus/templates/StimulusTemplates/image_22
img = nwbfile.stimulus_template['StimulusTemplates']['image_22'][:]
The dimensions of img will be (width, height, 3) where 3 is the number of color channels (RGB) in the image.

Here's how you can load a stimulus presentation using pynwb:
Suppose you have a stimulus presentation at
/stimulus/presentation/StimulusPresentation
presentation = nwbfile.get_stimulus['StimulusPresentation']
timestamps = presentation.get_timestamps()[:]
data = presentation.data[:]
`;

const getSystemMessage = async (
  tools: ToolItem[],
  chatContext: ChatContext,
  additionalKnowledge: string,
): Promise<string> => {
  // let allNeurodataTypes: string[];
  // try {
  //   allNeurodataTypes = await getAllNeurodataTypes();
  // } catch (e) {
  //   console.warn("Failed to get all neurodata types", e);
  //   allNeurodataTypes = [];
  // }
  let systemMessage: string = "";
  systemMessage += `
You are a helpful assistant that is responding to technical questions.
Your responses should be concise and informative with a scientific style and certainly not informal or overly verbose.

Do not deviate from the specific capabilities that are spelled out here.
Each capability starts with the word "CAPABILITY" in all caps, followed by a colon and then the description of the capability.
In your responses you should use one or more of the capabilities, using only the tools spelled out there.
Note that it is okay to use more than one capability in a response.

You should also respect invormation that starts with "NOTE" in all caps followed by a colon.

If the user asks about something that is not related to one of these capabilities, you should respond with a message indicating that you are unable to help with that question.
`;
  if (chatContext.type === "main") {
    systemMessage += `
NOTE: You are a responding to questions about data on the DANDI Archive.

NOTE: Whenever you provide a 6-digit Dandiset ID in response to a question you should use markdown notation for a link of the following format
[000409](https://neurosift.app/?p=/dandiset&dandisetId=000409)
where of course the number 000409 is replaced with the actual Dandiset ID.

CAPABILITY: Search for Dandisets either using the lexical_dandisets tool, the relevant_dandisets tool, and/or the neurodata_types tool and report the relevant results.
Assume that if the user is asking to find Dandisets, they also want to know more about those dandisets and how they are relevant to the user's query.
You should use the probe_dandiset tool for that.
If the user is looking for particular types of data, you will want to probe the neurodata types in DANDI by submitting scripts
to the probe_neurodata_types tool.
If the user wants dandisets with particular data type and also other criteria (like a prompt),
then you should first find the dandisets with the data types using the probe_neurodata_types tool,
and then use the relevant_dandisets tool with a restriction to the dandisets found in the previous step.
If the user wants to do a lexical search for dandisets, you can use the lexical_dandisets tool.
The results of lexical_dandisets will be in descending order of modified date, so you can also
use the with an empty search_text to get the most recently modified dandisets.

NOTE: When you use probe_dandiset, try to be specific based on the context. For example, instead of just saying "what's this dandiset about?" say "what's this dandiset about, especially relating to xyz".

NOTE: Here are the Neurodata types organized by category:

Base data types: NWBData, TimeSeriesReferenceVectorData, Image, ImageReferences, NWBContainer, NWBDataInterface, TimeSeries, ProcessingModule, Images
Devices: Device
Epochs: TimeIntervals
Image data: GrayscaleImage, RGBImage, RGBAImage, ImageSeries, ImageMaskSeries, OpticalSeries, IndexSeries
NWB file: ScratchData, NWBFile, LabMetaData, Subject
Miscellaneous neurodata_types: AbstractFeatureSeries, AnnotationSeries, IntervalSeries, DecompositionSeries, Units
Behavior: SpatialSeries, BehavioralEpochs, BehavioralEvents, BehavioralTimeSeries, PupilTracking, EyeTracking, CompassDirection, Position
Extracellular electrophysiology: ElectricalSeries, SpikeEventSeries, FeatureExtraction, EventDetection, EventWaveform, FilteredEphys, LFP, ElectrodeGroup, ClusterWaveforms, Clustering
Intracellular electrophysiology: PatchClampSeries, CurrentClampSeries, IZeroClampSeries, CurrentClampStimulusSeries, VoltageClampSeries, VoltageClampStimulusSeries, IntracellularElectrode, SweepTable, IntracellularElectrodesTable, IntracellularStimuliTable, IntracellularResponsesTable, IntracellularRecordingsTable, SimultaneousRecordingsTable, SequentialRecordingsTable, RepetitionsTable, ExperimentalConditionsTable
Optogenetics: OptogeneticSeries, OptogeneticStimulusSite
Optical physiology: OnePhotonSeries, TwoPhotonSeries, RoiResponseSeries, DfOverF, Fluorescence, ImageSegmentation, PlaneSegmentation, ImagingPlane, OpticalChannel, MotionCorrection, CorrectedImageStack
Retinotopy: ImagingRetinotopy

CAPABILITY: Provide information about neurodata types in DANDI Archive.

CAPABILITY: If the user wants to know about what column names are in units tables for various dandisets, you can use the probe_units_colnames tool to provide that information.

`;
  } else if (chatContext.type === "dandiset") {
    systemMessage += `
NOTE: You are responding to questions about Dandiset ${chatContext.dandisetId} in the DANDI Archive.

CAPABILITY: Respond to questions about the Dandiset ${chatContext.dandisetId} using the probe_dandiset tool.
Be specific based on the context. For example, instead of just saying "what's this dandiset about?" say "what's this dandiset about, especially relating to xyz".

`;
  } else if (chatContext.type === "nwb") {
    systemMessage += `
  NOTE: You are responding to questions about a specific NWB file defined as follows:
  Dandiset ID: ${chatContext.dandisetId}
  NWB URL: ${chatContext.nwbUrl}

  CAPABILITY: Respond to questions about the NWB file using the probe_nwb_file tool.
  You can also get more general information about the broader Dandiset using the probe_dandiset tool.

  If asked to analyze the data or provide plots, you should certainly use the probe_nwb_file tool first.
  `;
  }

  if (chatContext.type === "main" || chatContext.type === "dandiset") {
    systemMessage += `
NOTE: Whenever you refer to a particular NWB file, you should use the following link to it:
[label](https://neurosift.app/?p=/nwb&url=[download_url]&dandisetId=[dandiset_id]

CAPABILITY: If the user needs detailed information about a specific NWB file in a Dandiset, you should use the probe_nwb_file tool.
`;
  }

  if (
    chatContext.type === "main" ||
    chatContext.type === "dandiset" ||
    chatContext.type === "nwb"
  ) {
    systemMessage += `
========================
CAPABILITY: If the user wants to know how to load an NWB file in Python, you should provide a self-contained Python script.
Here are instructions for loading this NWB file into pynwb:

# Prerequisites:
pip install --upgrade lindi pynwb

\`\`\`python
import pynwb
import lindi

url = 'The URL of the NWB file'

# Load the remote NWB file
f = lindi.LindiH5pyFile.from_hdf5_file(url)"}
io = pynwb.NWBHDF5IO(file=f, mode='r')
nwbfile = io.read()

# Access the data
print(nwbfile)

# Close the file
io.close()
\`\`\`

IMPORTANT: However, if the url ends with .lindi.json or .lindi.tar, then you need to use
f = lindi.LindiH5pyFile.from_lindi_file(url)
instead of
f = lindi.LindiH5pyFile.from_hdf5_file(url)

Tip: when using Timeseries objects with pynwb it's better to use the x.get_timestamps()[:] method rather than x.timestamps, because sometimes start_time and rate is used instead.

Tip: It's important to use keyword arguments when creating the pynwb.NWBHDF5IO object.
========================

CAPABILITY: If the user wants plot or analyze data in an NWB file, you should use the generate_figure tool.
You pass in a self-contained script that uses matplotlib, and the output is markdown text that you can include in your response.
To construct the Python script, you should use the above method of loading the data together with your knowledge of pynwb and other Python libraries.
When constructing an example plot, be mindful of the size of the data you are loading. If it is too large, consider loading a subset of the data.

IMPORTANT: be sure to include the text output by the script in your generated response.
For example, if the response was ![plot](image://figure_1.png), you should include the text ![plot](image://figure_1.png) in your response.

The user may also ask for a script to generate a plot.
When convenient, please use complete self-contained Python scripts that can be run as-is, because
the user will have the ability to run the script from the interface.

It's okay if the user wants you to make a test plot.
`;
  }

  systemMessage += `
NOTE: Within a single response, do not make excessive calls to the tools. Maybe up to around 5 is reasonable. But if you want to make more, you could ask the user if they would like you to do more work to find the answer.

NOTE: Whenever you refer to a particular neurodata object (that is in an NWB file within a dandiset), you should use the following link to a visualization
[label](https://neurosift.app/?p=/nwb&url=[download_url]&dandisetId=[dandiset_id]&dandisetVersion=[dandiseet_version]&tab=view:[neurodata_type]|[object_path])

CAPABILITY: If the user asks for a random example of something then use Math.random in the javascript calls to truly provide a random example... don't just use the first in the list.

CAPABILITY: When asked about prompt ideas or how you can be helpful, you should give a thorough list of your capabilities as spelled out here with helpful summaries.

NOTE: Do not provide markdown links to NWB download URLs because those are impractical for downloading.

NOTE: When finding a random dandiset where the user has not provided any criteria, you should think of an actual neurophysiology topic, and then use the relevant_dandisets tool to find a random dandiset related to that topic. Don't just query for a generic term.

${pynwbTips}

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

const useSystemMessage = (
  tools: ToolItem[],
  chatContext: ChatContext,
  additionalKnowledge: string,
) => {
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  useEffect(() => {
    getSystemMessage(tools, chatContext, additionalKnowledge).then((msg) => {
      setSystemMessage(msg);
    });
  }, [tools, chatContext, additionalKnowledge]);
  return systemMessage;
};

// const getAllNeurodataTypes = async () => {
//   const a: any = await fetchNeurodataTypesIndex();
//   if (!a) {
//     throw new Error("Failed to fetch neurodata types index");
//   }
//   return a.neurodata_types.map((x: any) => x.neurodata_type);
// };

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

type HelpfulUnhelpfulButtonsProps = {
  onClick: (response: "helpful" | "unhelpful" | "neutral") => void;
};

const HelpfulUnhelpfulButtons: FunctionComponent<
  HelpfulUnhelpfulButtonsProps
> = ({ onClick }) => {
  return (
    <div>
      <span>
        <SmallIconButton
          onClick={() => onClick("helpful")}
          fontSize={12}
          icon={<FaRegThumbsUp />}
          title="This was helpful, provide feedback"
        />
      </span>
      <span>&nbsp;</span>
      <span>
        <SmallIconButton
          onClick={() => onClick("unhelpful")}
          fontSize={12}
          icon={<FaRegThumbsDown />}
          title="Not helpful or incorrect, provide feedback"
        />
      </span>
      <span>&nbsp;</span>
      <span>
        <SmallIconButton
          onClick={() => onClick("neutral")}
          fontSize={12}
          icon={<FaEnvelope />}
          title="Provide feedback"
        />
      </span>
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

type CompletionProgressWindowProps = {
  width: number;
  height: number;
  completionProgress: CompletionProgressMessage[];
};

const CompletionProgressWindow: FunctionComponent<
  CompletionProgressWindowProps
> = ({ width, height, completionProgress }) => {
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        top: 0,
        left: 0,
        backgroundColor: "#fff",
        opacity: 0.9,
        overflow: "auto",
        padding: 10,
      }}
    >
      {completionProgress.map((m, i) => (
        <div key={i}>
          <span style={{ color: m.type === "stdout" ? "black" : "red" }}>
            {m.message}
          </span>
        </div>
      ))}
    </div>
  );
};

type ConfirmOkayToRunWindowProps = {
  script: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmOkayToRunWindow: FunctionComponent<
  ConfirmOkayToRunWindowProps
> = ({ script, onConfirm, onCancel }) => {
  return (
    <div style={{ padding: 20 }}>
      <p>
        The agent would like to run the following script on your Jupyter runtime
        kernel. Are you okay with this?
      </p>
      <div>
        <SmallIconButton
          icon={<Check />}
          onClick={onConfirm}
          title="Confirm"
          label="Confirm"
        />
        &nbsp;&nbsp;&nbsp;
        <SmallIconButton
          icon={<Cancel />}
          onClick={onCancel}
          title="Cancel"
          label="Cancel"
        />
      </div>
      <div>
        <Markdown source={`\`\`\`python\n${script}\n\`\`\``} />
      </div>
    </div>
  );
};

export default ChatWindow;
