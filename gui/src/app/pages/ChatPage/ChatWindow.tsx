import { SmallIconButton } from "@fi-sci/misc";
import {
  Cancel,
  Circle,
  DeleteForever,
  DockTwoTone,
  ForkLeft,
  Save,
  Send,
  SubtitlesTwoTone,
  ThreeDRotation,
} from "@mui/icons-material";
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
import chatCompletion from "./chatCompletion";
import { lexicaltDandisetsTool } from "./tools/lexicalDandisets";
import { probeDandisetTool } from "./tools/probeDandiset";
import { dandisetObjectsTool } from "./tools/probeDandisetObjects";
import { neurodataTypesTool } from "./tools/probeNeurodataTypes";
import { unitsColnamesTool } from "./tools/probeUnitsColnames";
import { relevantDandisetsTool } from "./tools/relevantDandisets";
import { timeseriesAlignmentViewTool } from "./tools/timeseriesAlignmentView";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import SaveChatDialog from "./SaveChatDialog";
import { FaRegThumbsDown, FaRegThumbsUp, FaThumbsUp } from "react-icons/fa";
import FeedbackWindow from "./FeedbackWindow";

export type Chat = {
  messages: (ORMessage | { role: "client-side-only"; content: string })[];
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
  chatContext: ChatContext;
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
  onToggleLeftPanel,
  chatContext,
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
      ret.push(probeDandisetTool);
      ret.push(timeseriesAlignmentViewTool);
    }
    return ret;
  }, [chatContext]);

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
    if (chatContext.type === "main") {
      return `Neurosift chat`;
    } else if (chatContext.type === "dandiset") {
      return `I can help you find information about Dandiset ${chatContext.dandisetId}.`;
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
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const {
    handleOpen: openFeedbackWindow,
    handleClose: closeFeedbackWindow,
    visible: feedbackWindowVisible,
  } = useModalWindow();
  const [feedbackResponse, setFeedbackResponse] = useState<
    "helpful" | "unhelpful"
  >("helpful");

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
                        setChat({
                          messages: messages.slice(0, index),
                        });
                      }}
                      icon={<>...</>}
                      title="Delete this prompt"
                    />
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
  }

  if (chatContext.type === "main" || chatContext.type === "dandiset") {
    systemMessage += `
NOTE: Whenever you refer to a particular NWB file, you should use the following link to it:
[label](https://neurosift.app/?p=/nwb&url=[download_url]&dandisetId=[dandiset_id]

`;
  }

  systemMessage += `
NOTE: Within a single response, do not make excessive calls to the tools. Maybe up to around 5 is reasonable. But if you want to make more, you could ask the user if they would like you to do more work to find the answer.

NOTE: Whenever you refer to a particular neurodata object (that is in an NWB file within a dandiset), you should use the following link to a visualization
[label](https://neurosift.app/?p=/nwb&url=[download_url]&dandisetId=[dandiset_id]&dandisetVersion=[dandiseet_version]&tab=view:[neurodata_type]|[object_path])

CAPABILITY: If the user asks for a random example of something then use Math.random in the javascript calls to truly provide a random example... don't just use the first in the list.

CAPABILITY: When asked about prompt ideas or how you can be helpful, you should give a thorough list of your capabilities as spelled out here with helpful summaries.

NOTE: If asked to plot something, you should decline unless you have a specific capability that allows you to plot that thing.

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

type HelpfulUnhelpfulButtonsProps = {
  onClick: (response: "helpful" | "unhelpful") => void;
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
          title="This was helpful"
        />
      </span>
      <span>&nbsp;</span>
      <span>
        <SmallIconButton
          onClick={() => onClick("unhelpful")}
          fontSize={12}
          icon={<FaRegThumbsDown />}
          title="This was not helpful or incorrect"
        />
      </span>
    </div>
  );
};

export default ChatWindow;
