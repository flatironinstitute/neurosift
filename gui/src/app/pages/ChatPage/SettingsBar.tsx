import { SmallIconButton } from "@fi-sci/misc";
import { Cancel, ForkLeft, Save } from "@mui/icons-material";
import { FunctionComponent } from "react";
import { FaBrain } from "react-icons/fa";

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
          const ok = window.confirm(
            "Are you sure you want to clear all messages?",
          );
          if (!ok) return;
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

export default SettingsBar;
