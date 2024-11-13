import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Markdown from "../../components/Markdown";
import Splitter from "../../components/Splitter";
import useRoute from "../../contexts/useRoute";
import AgentProgressWindow, {
  AgentProgressMessage,
} from "./AgentProgressWindow";
import { Chat, ChatAction } from "./Chat";
import chatCompletion from "./chatCompletion";
import { ChatContext } from "./ChatContext";
import ConfirmOkayToRunWindow from "./ConfirmOkayToRunWindow";
import FeedbackWindow from "./FeedbackWindow";
import HelpfulUnhelpfulButtons from "./HelpfulUnhelpfulButtons";
import InputBar from "./InputBar";
import { useJupyterConnectivity } from "./JupyterConnectivity";
import MessageDisplay from "./MessageDisplay";
import { ORMessage, ORToolCall } from "./openRouterTypes";
import PythonSessionClient, {
  NeurosiftFigureContent,
  PlotlyContent,
} from "./PythonSessionClient";
import RunCodeWindow, {
  PythonSessionStatus,
  RunCodeCommunicator,
} from "./RunCodeWindow";
import SaveChatDialog from "./SaveChatDialog";
import SettingsBar from "./SettingsBar";
import { useSystemMessage } from "./systemMessage";
import ToolElement from "./ToolElement";
import { ToolItem } from "./ToolItem";
import ToolResponseView from "./ToolResponseView";
import { computeTool } from "./tools/compute";
import { ExecuteScript, generateFigureTool } from "./tools/generateFigure";
import { lexicaltDandisetsTool } from "./tools/lexicalDandisets";
import { probeDandisetTool } from "./tools/probeDandiset";
import { dandisetObjectsTool } from "./tools/probeDandisetObjects";
import { neurodataTypesTool } from "./tools/probeNeurodataTypes";
import { probeNwbFileTool } from "./tools/probeNwbFile";
import { unitsColnamesTool } from "./tools/probeUnitsColnames";
import { relevantDandisetsTool } from "./tools/relevantDandisets";
import { timeseriesAlignmentViewTool } from "./tools/timeseriesAlignmentView";

type ChatWindowProps = {
  width: number;
  height: number;
  chat: Chat;
  chatDispatch: (action: ChatAction) => void;
  openRouterKey: string | null;
  onLogMessage?: (title: string, message: string) => void;
  onToggleLeftPanel?: () => void;
  chatContext: ChatContext;
  allowSaveChat?: boolean;
};

const ChatWindow: FunctionComponent<ChatWindowProps> = ({
  width,
  height,
  chat,
  chatDispatch,
  openRouterKey,
  onLogMessage,
  onToggleLeftPanel,
  chatContext,
  allowSaveChat = true,
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
      runCodeCommunicator.runCode(
        code,
        {
          onStdout: (message) => {
            //
          },
          onStderr: (message) => {
            //
          },
          onImage: (format, content) => {
            //
          },
          onFigure: (a) => {
            //
          },
        },
        {
          current: false,
        },
      );
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
        chatDispatch={chatDispatch}
        openRouterKey={openRouterKey}
        onLogMessage={onLogMessage}
        onToggleLeftPanel={onToggleLeftPanel}
        chatContext={chatContext}
        onRunCode={handleRunCode}
        pythonSessionStatus={pythonSessionStatus}
        allowSaveChat={allowSaveChat}
      />
      <RunCodeWindow
        width={0}
        height={0}
        runCodeCommunicator={runCodeCommunicator}
      />
    </Splitter>
  );
};

const MainChatWindow: FunctionComponent<
  ChatWindowProps & {
    onRunCode: (code: string) => void;
    pythonSessionStatus: PythonSessionStatus;
  }
> = ({
  width,
  height,
  chat,
  chatDispatch,
  openRouterKey,
  onLogMessage,
  onToggleLeftPanel,
  chatContext,
  onRunCode,
  pythonSessionStatus,
  allowSaveChat = true,
}) => {
  const { setRoute } = useRoute();
  const inputBarHeight = 30;
  const settingsBarHeight = 20;
  const topBarHeight = 24;

  const [modelName, setModelName] = useState("openai/gpt-4o");

  const handleUserMessage = useCallback(
    (message: string) => {
      chatDispatch({
        type: "add-message",
        message: { role: "user", content: message },
      });
      setAtLeastOneUserMessageSubmitted(true);
    },
    [chatDispatch],
  );

  const messages = chat.messages;

  // last message
  const lastMessage = useMemo(() => {
    const messages2: ORMessage[] = [
      ...messages.filter((x) => x.role !== "client-side-only"),
    ];
    if (messages2.length === 0) return null;
    return messages2[messages2.length - 1];
  }, [messages]);

  // last message is user or tool
  const lastMessageIsUserOrTool = useMemo(() => {
    return lastMessage
      ? lastMessage.role === "user" || lastMessage.role === "tool"
      : false;
  }, [lastMessage]);

  // last message is tool calls
  const lastMessageIsToolCalls = useMemo(() => {
    return lastMessage
      ? !!(
          lastMessage.role === "assistant" &&
          lastMessage.content === null &&
          lastMessage.tool_calls
        )
      : false;
  }, [lastMessage]);

  // last message is assistant non-tool call
  const lastMessageIsAssistantNonToolCall = useMemo(() => {
    return lastMessage
      ? lastMessage.role === "assistant" && !(lastMessage as any).tool_calls
      : false;
  }, [lastMessage]);

  // define the tools
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
      ret.push(computeTool);
    }
    return ret;
  }, [chatContext]);

  // system message
  const systemMessage = useSystemMessage(tools, chatContext, "");

  // save chat
  const {
    handleOpen: openSaveChat,
    handleClose: closeSaveChat,
    visible: saveChatVisible,
  } = useModalWindow();

  // has no user messages
  const hasNoUserMessages = useMemo(() => {
    return !messages.some((x) => x.role === "user");
  }, [messages]);

  const [editedPromptText, setEditedPromptText] = useState("");

  // backup and erase last user message
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
    chatDispatch({
      type: "truncate-messages",
      lastMessage: messages[lastUserMessageIndex - 1] || null,
    });
    if (typeof lastUserMessageContent === "string") {
      setEditedPromptText(lastUserMessageContent);
    }
  }, [messages, chatDispatch]);

  // agent progress
  const [agentProgress, setAgentProgress] = useState<AgentProgressMessage[]>(
    [],
  );
  const resetAgentProgress = useCallback(() => {
    setAgentProgress([]);
  }, []);
  const addAgentProgressMessage = useCallback(
    (type: "stdout" | "stderr", message: string) => {
      setAgentProgress((prev) => [
        ...prev,
        {
          type,
          message,
        },
      ]);
    },
    [],
  );

  // confirm okay to run
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

  // last completion failed
  const [lastCompletionFailed, setLastCompletionFailed] = useState(false);
  const [lastCompletionFailedRefreshCode, setLastCompletionFailedRefreshCode] =
    useState(0);

  // Last message is user or tool, so we need to do a completion
  useEffect(() => {
    if (!systemMessage) return;
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
    if (!["user", "tool"].includes(lastMessage.role)) return;
    (async () => {
      setLastCompletionFailed(false);
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
        setLastCompletionFailed(true);
        return;
      }
      if (canceled) return;
      if (toolCalls) {
        // tool calls
        chatDispatch({
          type: "add-message",
          message: {
            role: "assistant",
            content: assistantMessage || null,
            tool_calls: toolCalls,
          },
        });
      } else {
        if (!assistantMessage) {
          console.warn("Unexpected: no assistant message and no tool calls");
          return;
        }
        chatDispatch({
          type: "add-message",
          message: { role: "assistant", content: assistantMessage },
        });
      }
    })();
    return () => {
      canceled = true;
    };
  }, [
    messages,
    modelName,
    openRouterKey,
    tools,
    systemMessage,
    backUpAndEraseLastUserMessage,
    chatDispatch,
    lastCompletionFailedRefreshCode,
  ]);

  // pending tool calls
  const [pendingToolCalls, setPendingToolCalls] = useState<ORToolCall[]>([]);

  const [scriptExecutionStatus, setScriptExecutionStatus] = useState<
    "none" | "starting" | "running"
  >("none");
  const scriptCancelTrigger = useRef<boolean>(false);

  const jupyterConnectivityState = useJupyterConnectivity();

  const runningToolCalls = useRef(false);

  // last message is assistant with tool calls, so we need to run the tool calls
  useEffect(() => {
    if (!systemMessage) return;
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
    if (lastMessage.role !== "assistant") return;
    if (!(lastMessage as any).tool_calls) return;
    if (runningToolCalls.current) return;
    (async () => {
      const newMessages: ORMessage[] = [];
      const toolCalls: ORToolCall[] = (lastMessage as any).tool_calls;
      const processToolCall = async (tc: any) => {
        const func = tools.find(
          (x) => x.tool.function.name === tc.function.name,
        )?.function;
        if (!func) {
          throw Error(`Unexpected. Did not find tool: ${tc.function.name}`);
        }
        const args = JSON.parse(tc.function.arguments);
        console.info("TOOL CALL: ", tc.function.name, args);
        const executeScript2: ExecuteScript = async (
          script: string,
          o: {
            onStdout?: (message: string) => void;
            onStderr?: (message: string) => void;
            onImage?: (format: "png", content: string) => void;
            onFigure?: (
              a:
                | { format: "plotly"; content: PlotlyContent }
                | {
                    format: "neurosift_figure";
                    content: NeurosiftFigureContent;
                  },
            ) => void;
          },
        ) => {
          setScriptExecutionStatus("starting");
          scriptCancelTrigger.current = false;
          const pythonSessionClient = new PythonSessionClient(
            jupyterConnectivityState,
          );
          try {
            pythonSessionClient.onOutputItem((item) => {
              if (item.type === "stdout") {
                o.onStdout && o.onStdout(item.content);
              } else if (item.type === "stderr") {
                o.onStderr && o.onStderr(item.content);
              } else if (item.type === "image") {
                o.onImage && o.onImage(item.format, item.content);
              } else if (item.type === "figure") {
                o.onFigure &&
                  o.onFigure({
                    format: item.format as any,
                    content: item.content as any,
                  });
              }
            });
            await pythonSessionClient.initiate();
            setScriptExecutionStatus("running");
            await new Promise<void>((resolve, reject) => {
              let done = false;
              pythonSessionClient
                .runCode(script)
                .then(() => {
                  if (done) return;
                  done = true;
                  resolve();
                })
                .catch((e) => {
                  if (done) return;
                  done = true;
                  reject(e);
                });
              const check = () => {
                if (done) return;
                if (scriptCancelTrigger.current) {
                  done = true;
                  reject(new Error("Script execution cancelled by user"));
                  return;
                }
                setTimeout(check, 100);
              };
              check();
            });
          } finally {
            pythonSessionClient.shutdown();
            setScriptExecutionStatus("none");
          }
        };
        let response: string;
        // let errorMessage: string | undefined;
        try {
          addAgentProgressMessage(
            "stdout",
            `Running tool: ${tc.function.name}`,
          );
          response = await func(args, onLogMessage || (() => {}), {
            modelName,
            openRouterKey,
            executeScript: executeScript2,
            onStdout: (message) => {
              addAgentProgressMessage("stdout", message);
            },
            onStderr: (message) => {
              addAgentProgressMessage("stderr", message);
            },
            onAddImage: (name, url) => {
              chatDispatch({
                type: "set-file",
                name,
                content: arrayBufferFromPngDataUrl(url),
              });
            },
            onAddFigureData: (name, content) => {
              chatDispatch({
                type: "set-file",
                name,
                content,
              });
            },
            confirmOkayToRun,
          });
        } catch (e: any) {
          // errorMessage = e.message;
          response = "Error: " + e.message;
        }
        if (canceled) return;
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
      };
      // run the tool calls in parallel
      resetAgentProgress();
      runningToolCalls.current = true;
      try {
        setPendingToolCalls(toolCalls);
        const toolItems = toolCalls.map((tc) =>
          tools.find((x) => x.tool.function.name === tc.function.name),
        );
        const serialIndices = toolItems
          .map((x, i) => ({ x, i }))
          .filter((a) => a.x?.serial)
          .map((a) => a.i);
        const nonSerialIndices = toolItems
          .map((x, i) => ({ x, i }))
          .filter((a) => !a.x?.serial)
          .map((a) => a.i);
        for (const i of serialIndices) {
          await processToolCall(toolCalls[i]);
        }
        await Promise.all(
          toolCalls
            .filter((_, i) => nonSerialIndices.includes(i))
            .map(processToolCall),
        );
      } finally {
        runningToolCalls.current = false;
        setPendingToolCalls([]);
        resetAgentProgress();
      }
      if (canceled) return;
      chatDispatch({
        type: "add-messages",
        messages: newMessages,
      });
    })();
    return () => {
      canceled = true;
    };
  }, [
    messages,
    modelName,
    openRouterKey,
    tools,
    systemMessage,
    chatDispatch,
    resetAgentProgress,
    addAgentProgressMessage,
    confirmOkayToRun,
    onLogMessage,
    jupyterConnectivityState,
  ]);

  // div refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);

  // at least one user message submitted in this user session
  const [atLeastOneUserMessageSubmitted, setAtLeastOneUserMessageSubmitted] =
    useState(false);

  // special link in markdown clicked
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

  // initial message at the top of the chat window
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

  // whether the input bar is enabled
  const inputBarEnabled = useMemo(() => {
    return !lastMessageIsUserOrTool && !lastMessageIsToolCalls;
  }, [lastMessageIsUserOrTool, lastMessageIsToolCalls]);

  // suggested questions depending on the context
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
      chatDispatch({
        type: "add-message",
        message: { role: "user", content: question },
      });
      setAtLeastOneUserMessageSubmitted(true);
    },
    [chatDispatch, inputBarEnabled],
  );

  // layout
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

  // feedback from user about the last assistant message
  const {
    handleOpen: openFeedbackWindow,
    handleClose: closeFeedbackWindow,
    visible: feedbackWindowVisible,
  } = useModalWindow();
  const [feedbackResponse, setFeedbackResponse] = useState<
    "helpful" | "unhelpful" | "neutral"
  >("helpful");

  // truncate at a particular message
  const truncateAtMessage = useCallback(
    (m: ORMessage) => {
      const index = messages.indexOf(m);
      if (index < 0) return;
      chatDispatch({
        type: "truncate-messages",
        lastMessage: messages[index - 1] || null,
      });
    },
    [messages, chatDispatch],
  );

  // open window to see the data for a tool response
  const [openToolResponseData, setOpenToolResponseData] = useState<{
    toolCall: ORToolCall;
    toolResponse: ORMessage;
  } | null>(null);
  const {
    handleOpen: openToolResponse,
    handleClose: closeToolResponse,
    visible: toolResponseVisible,
  } = useModalWindow();
  const handleOpenToolResponse = useCallback(
    (toolCall: ORToolCall, toolResponse: ORMessage) => {
      setOpenToolResponseData({ toolCall, toolResponse });
      openToolResponse();
    },
    [openToolResponse],
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
        {suggestedQuestions.length > 0 && hasNoUserMessages && (
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
        {messages
          .filter((m) => {
            if (m.role === "assistant" && m.content === null) {
              return false;
            }
            return true;
          })
          .map((c, index) => (
            <div
              key={index}
              style={{
                color: colorForRole(c.role),
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
                    files={chat.files}
                  />
                </>
              ) : c.role === "assistant" && !!(c as any).tool_calls ? (
                <>
                  <div>Tool calls</div>
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
              ) : c.role === "tool" ? (
                <div>
                  <ToolElement
                    message={c}
                    messages={messages}
                    onOpenToolResponse={(toolCall, toolResponse) => {
                      handleOpenToolResponse(toolCall, toolResponse);
                    }}
                  />
                </div>
              ) : c.role === "client-side-only" ? (
                <>
                  <div
                    style={{
                      color: (c as any).color || "#6a6",
                      paddingBottom: 10,
                    }}
                  >
                    {(c as any).content}
                  </div>
                </>
              ) : (
                <span>Unknown role: {c.role}</span>
              )}
            </div>
          ))}
        {(lastMessageIsUserOrTool || lastMessageIsToolCalls) && (
          <div>
            <span style={{ color: "#6a6" }}>processing...</span>
          </div>
        )}
        {lastMessageIsAssistantNonToolCall && (
          <HelpfulUnhelpfulButtons
            onClick={(response) => {
              setFeedbackResponse(response);
              openFeedbackWindow();
            }}
          />
        )}
        {pendingToolCalls.length > 0 && (
          <div>
            {pendingToolCalls.length === 1
              ? `Processing tool call: ${pendingToolCalls[0].function.name}`
              : `Processing ${pendingToolCalls.length} tool calls: ${pendingToolCalls.map((x) => x.function.name).join(", ")}`}
          </div>
        )}
        {agentProgress.length > 0 && (
          <AgentProgressWindow
            width={chatAreaWidth - 10}
            height={400}
            agentProgress={agentProgress}
          />
        )}
        {lastCompletionFailed && (
          <div>
            <span style={{ color: "red" }}>
              {`An error occurred retrieving the assistant's response. `}
              <Hyperlink
                onClick={() => {
                  setLastCompletionFailedRefreshCode((x) => x + 1);
                }}
              >
                Try again
              </Hyperlink>
            </span>
          </div>
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
          onClearAllMessages={() => {
            chatDispatch({
              type: "clear-messages",
            });
          }}
          modelName={modelName}
          setModelName={setModelName}
          onToggleLeftPanel={onToggleLeftPanel}
          onSaveChat={allowSaveChat ? openSaveChat : undefined}
          onCancelScript={
            scriptExecutionStatus === "running"
              ? () => {
                  scriptCancelTrigger.current = true;
                }
              : undefined
          }
        />
      </div>
      <ModalWindow visible={saveChatVisible} onClose={closeSaveChat}>
        <SaveChatDialog
          chat={chat}
          onClose={closeSaveChat}
          openRouterKey={openRouterKey}
          chatContext={chatContext}
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
      <ModalWindow visible={toolResponseVisible} onClose={closeToolResponse}>
        {openToolResponseData ? (
          <ToolResponseView
            toolCall={openToolResponseData.toolCall}
            toolResponse={openToolResponseData.toolResponse}
          />
        ) : (
          <span>Unexpected: no tool response data</span>
        )}
      </ModalWindow>
    </div>
  );
};

const colorForRole = (role: string) => {
  // for now we do it randomly and see how it looks
  const hash = role.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const r = hash % 200;
  const g = (hash * 2) % 200;
  const b = (hash * 3) % 200;
  return `rgb(${r},${g},${b})`;
};

const arrayBufferFromPngDataUrl = (dataUrl: string) => {
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    throw new Error("Invalid data URL");
  }
  const mime = parts[0].split(":")[1].split(";")[0];
  if (mime !== "image/png") {
    throw new Error("Unexpected MIME type: " + mime);
  }
  const data = parts[1];
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer;
};

export default ChatWindow;
