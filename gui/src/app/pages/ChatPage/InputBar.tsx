import { SmallIconButton } from "@fi-sci/misc";
import { Send } from "@mui/icons-material";
import { FunctionComponent, useCallback } from "react";

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

export default InputBar;
