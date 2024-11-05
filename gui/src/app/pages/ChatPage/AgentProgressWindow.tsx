import { FunctionComponent } from "react";

export type AgentProgressMessage = {
  type: "stdout" | "stderr";
  message: string;
};

type AgentProgressWindowProps = {
  width: number;
  height: number;
  agentProgress: AgentProgressMessage[];
};

const AgentProgressWindow: FunctionComponent<AgentProgressWindowProps> = ({
  width,
  height,
  agentProgress,
}) => {
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
      {agentProgress.map((m, i) => (
        <div key={i}>
          <span style={{ color: m.type === "stdout" ? "black" : "red" }}>
            {m.message}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AgentProgressWindow;
