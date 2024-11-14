import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import Markdown from "neurosift-lib/components/Markdown";
import AgentProgressWindow, {
  AgentProgressMessage,
} from "neurosift-lib/pages/ChatPage/AgentProgressWindow";
import { Chat, ChatAction } from "neurosift-lib/pages/ChatPage/Chat";
import chatCompletion from "neurosift-lib/pages/ChatPage/chatCompletion";
import InputBar from "neurosift-lib/pages/ChatPage/InputBar";
import MessageDisplay from "neurosift-lib/pages/ChatPage/MessageDisplay";
import {
  ORMessage,
  ORToolCall,
} from "neurosift-lib/pages/ChatPage/openRouterTypes";
import SettingsBar from "neurosift-lib/pages/ChatPage/SettingsBar";
import ToolElement from "neurosift-lib/pages/ChatPage/ToolElement";
import { ToolItem } from "neurosift-lib/pages/ChatPage/ToolItem";
import ToolResponseView from "neurosift-lib/pages/ChatPage/ToolResponseView";
import { dandisetObjectsTool } from "neurosift-lib/pages/ChatPage/tools/probeDandisetObjects";
import { neurodataTypesTool } from "neurosift-lib/pages/ChatPage/tools/probeNeurodataTypes";
import { probeNwbFileTool } from "neurosift-lib/pages/ChatPage/tools/probeNwbFile";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dandiset } from "./dandi-archive-schema";

type EditDandisetMetadataChatWindowProps = {
  width: number;
  height: number;
  chat: Chat;
  chatDispatch: (action: ChatAction) => void;
  openRouterKey: string | null;
  dandisetId: string;
  dandisetVersion: string;
  dandisetMetadata: Dandiset;
};

const EditDandisetMetadataChatWindow: FunctionComponent<
  EditDandisetMetadataChatWindowProps
> = ({
  width,
  height,
  chat,
  chatDispatch,
  openRouterKey,
  dandisetId,
  dandisetVersion,
  dandisetMetadata,
}) => {
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
    ret.push(dandisetObjectsTool);
    ret.push(neurodataTypesTool);
    // ret.push(probeDandisetTool);
    // ret.push(timeseriesAlignmentViewTool);
    ret.push(probeNwbFileTool);
    return ret;
  }, []);

  // system message
  const systemMessage = useSystemMessage(
    tools,
    dandisetId,
    dandisetVersion,
    dandisetMetadata,
  );

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
        console.info("TOOL CALL: ", tc.function.name, args, tc);
        let response: string;
        // let errorMessage: string | undefined;
        const confirmOkayToRun = async (script: string) => {
          return false;
        };
        try {
          addAgentProgressMessage(
            "stdout",
            `Running tool: ${tc.function.name}`,
          );
          console.info(`Running ${tc.function.name}`);
          response = await func(args, () => {}, {
            modelName,
            openRouterKey,
            executeScript: async () => {},
            onStdout: (message) => {
              addAgentProgressMessage("stdout", message);
            },
            onStderr: (message) => {
              addAgentProgressMessage("stderr", message);
            },
            onAddImage: (name, url) => {},
            onAddFigureData: (name, content) => {},
            confirmOkayToRun,
          });
        } catch (e: any) {
          console.error(`Error in tool ${tc.function.name}`, e);
          // errorMessage = e.message;
          response = "Error: " + e.message;
        }
        if (canceled) {
          console.warn(
            `WARNING!!! Hook canceled during tool call ${tc.function.name}`,
          );
          return;
        }
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
  ]);

  // div refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);

  // at least one user message submitted in this user session
  const [atLeastOneUserMessageSubmitted, setAtLeastOneUserMessageSubmitted] =
    useState(false);

  // initial message at the top of the chat window
  const initialMessage = useMemo(() => {
    return `I can help you edit the metadata for ${dandisetMetadata.id}`;
  }, [dandisetMetadata.id]);

  // whether the input bar is enabled
  const inputBarEnabled = useMemo(() => {
    return !lastMessageIsUserOrTool && !lastMessageIsToolCalls;
  }, [lastMessageIsUserOrTool, lastMessageIsToolCalls]);

  // suggested questions depending on the context
  const suggestedQuestions = useMemo(() => {
    return [];
  }, []);
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
  const chatAreaWidth = Math.min(width - 30, 1100);
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

  const handleDownloadChat = useCallback(() => {
    // download to a .nschat file
    const blob = new Blob([JSON.stringify(chat, null, 2)], {
      type: "application/json",
    });
    const fileName = prompt("Enter a file name", "chat.nschat");
    if (!fileName) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [chat]);

  const handleUploadChat = useCallback(() => {
    // have user select a .nschat file from their machine and load it
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".nschat";
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      const text = await file.text();
      const chat2 = JSON.parse(text);
      chatDispatch({ type: "set", chat: chat2 });
    };
    input.click();
  }, [chatDispatch]);

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
                  <Markdown source={c.content as string} />
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
          onDownloadChat={handleDownloadChat}
          onUploadChat={handleUploadChat}
        />
      </div>
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

const useSystemMessage = (
  tools: ToolItem[],
  dandisetId: string,
  dandisetVersion: string,
  dandisetMetadata: Dandiset,
) => {
  let systemMessage = `
You are a helpful assistant that is responding to technical questions.
Your responses should be concise and informative with a scientific style and certainly not informal or overly verbose.

Do not deviate from the specific capabilities that are spelled out here.
Each capability starts with the word "CAPABILITY" in all caps, followed by a colon and then the description of the capability.
In your responses you should use one or more of the capabilities, using only the tools spelled out there.
Note that it is okay to use more than one capability in a response.

You should also respect information that starts with "NOTE" in all caps followed by a colon.

If the user asks about something that is not related to one of these capabilities, you should respond with a message indicating that you are unable to help with that question.

You are helping the user edit the metadata for a Dandiset.

Here is the information about the Dandiset:
========================
Dandiset ID: ${dandisetId}
Dandiset Version: ${dandisetVersion}
Name: ${dandisetMetadata.name}
Description: ${dandisetMetadata.description}
========================

If the user talks about revising something, they mean revising the current metadata for the Dandiset.

`;
  // note: including all the metadata fields in the system message takes too many tokens.

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
  return systemMessage;
};

export default EditDandisetMetadataChatWindow;
