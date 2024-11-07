import { Hyperlink } from "@fi-sci/misc";
import { ORMessage, ORToolCall } from "./openRouterTypes";
import { FunctionComponent, useMemo } from "react";

type ToolElementProps = {
  message: ORMessage;
  messages: (
    | ORMessage
    | { role: "client-side-only"; content: string; color?: string }
  )[];
  onOpenToolResponse: (toolCall: ORToolCall, toolResponse: ORMessage) => void;
};

const ToolElement: FunctionComponent<ToolElementProps> = ({
  message,
  messages,
  onOpenToolResponse,
}) => {
  if (message.role !== "tool") {
    throw new Error("Expected tool message");
  }
  const lastAssistantMessage = useMemo(() => {
    const toolMessageIndex = messages.indexOf(message);
    if (toolMessageIndex < 0) {
      return null;
    }
    for (let i = toolMessageIndex - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") {
        return m;
      }
    }
    return null;
  }, [messages, message]);
  if (!lastAssistantMessage) {
    return <span>Unable to find tool call for this tool response.</span>;
  }
  if (lastAssistantMessage.role !== "assistant") {
    throw new Error("Expected last assistant message");
  }
  const toolCalls: ORToolCall[] = (lastAssistantMessage as any).tool_calls;
  if (!toolCalls) {
    return <span>Unable to find tool calls for this tool response.</span>;
  }
  const toolCall = toolCalls.find((tc) => tc.id === message.tool_call_id);
  if (!toolCall) {
    return <span>Unable to find tool call for this tool response.</span>;
  }
  const isError = message.content.toLowerCase().startsWith("error");
  return (
    <span>
      <Hyperlink
        onClick={() => {
          onOpenToolResponse(toolCall, message);
        }}
        title="Open this tool response"
        color={isError ? "red" : "darkgreen"}
      >
        {isError
          ? "✗ " + toolCall.function.name
          : "✓ " + toolCall.function.name}
      </Hyperlink>
    </span>
  );
};

export default ToolElement;
