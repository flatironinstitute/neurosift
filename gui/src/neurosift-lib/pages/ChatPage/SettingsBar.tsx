import { SmallIconButton } from "@fi-sci/misc";
import {
  Cancel,
  ClearAll,
  CloudUpload,
  Download,
  ForkLeft,
  Save,
  Upload,
} from "@mui/icons-material";
import { FunctionComponent } from "react";

type SettingsBarProps = {
  width: number;
  height: number;
  onClearAllMessages: () => void;
  modelName: string;
  setModelName: (name: string) => void;
  onToggleLeftPanel?: () => void;
  onSaveChatToCloud?: () => void;
  onCancelScript?: () => void;
  onDownloadChat?: () => void;
  onUploadChat?: () => void;
};

const modelOptions = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  // "google/gemini-2.0-flash-exp:free",
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
  onSaveChatToCloud,
  onCancelScript,
  onDownloadChat,
  onUploadChat,
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
        icon={<ClearAll />}
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
      {onSaveChatToCloud && (
        <SmallIconButton
          icon={<CloudUpload />}
          onClick={onSaveChatToCloud}
          title="Save chat to cloud"
        />
      )}
      {onDownloadChat && (
        <SmallIconButton
          icon={<Download />}
          onClick={onDownloadChat}
          title="Download chat"
        />
      )}
      {onUploadChat && (
        <SmallIconButton
          icon={<Upload />}
          onClick={onUploadChat}
          title="Upload chat"
        />
      )}
      {onCancelScript && (
        <SmallIconButton
          icon={<Cancel />}
          onClick={onCancelScript}
          title="Cancel running script"
        />
      )}
      <span>&nbsp;&nbsp;AI can be inaccurate.</span>
    </span>
  );
};

export default SettingsBar;
