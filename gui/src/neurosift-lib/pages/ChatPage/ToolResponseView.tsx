import Markdown from "../../components/Markdown";
import { ORMessage, ORToolCall } from "./openRouterTypes";
import { FunctionComponent } from "react";

type ToolResponseViewProps = {
  toolCall: ORToolCall;
  toolResponse: ORMessage;
};

const ToolResponseView: FunctionComponent<ToolResponseViewProps> = ({
  toolCall,
  toolResponse,
}) => {
  if (toolResponse.role !== "tool") {
    throw new Error("Expected tool message for tool response");
  }
  const args: { [argname: string]: any } = JSON.parse(
    toolCall.function.arguments,
  );
  return (
    <div style={{ padding: 20 }}>
      <div>
        <h4>Function: {toolCall.function.name}</h4>
      </div>
      <div>
        <h4>Arguments</h4>
        <table
          style={{
            borderCollapse: "collapse",
            border: "1px solid black",
          }}
        >
          <tbody>
            {Object.entries(args).map(([argname, argvalue]) => (
              <tr key={argname}>
                <td style={{ border: "1px solid black", padding: 5 }}>
                  {argname}
                </td>
                <td style={{ border: "1px solid black", padding: 5 }}>
                  {argname === "script" ? (
                    <Markdown source={`\`\`\`python\n${argvalue}\n\`\`\``} />
                  ) : (
                    JSON.stringify(argvalue)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4>Response</h4>
        <pre>{toolResponse.content}</pre>
      </div>
    </div>
  );
};

export default ToolResponseView;
