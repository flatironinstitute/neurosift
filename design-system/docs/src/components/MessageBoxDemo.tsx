import { Button, TextArea } from "@ui";
import { useId, useState, type FormEvent, type KeyboardEvent } from "react";

/** A chat message box, Large beside a Large Send: Enter sends, Shift+Enter adds a line, and the sent messages list above it. */
export default function MessageBoxDemo() {
  const [text, setText] = useState("");
  const helperId = useId();
  const [sent, setSent] = useState<string[]>([]);
  const send = () => {
    if (!text.trim()) return;
    setSent([...sent, text]);
    setText("");
  };
  const sendOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    send();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  return (
    <form className="message-box-demo" onSubmit={submit}>
      <ol
        className="message-box-sent"
        aria-label="Sent messages"
        aria-live="polite"
      >
        {sent.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ol>
      <div className="message-box-row">
        <TextArea
          label="Message"
          hideLabel
          placeholder="Ask about this Dandiset"
          aria-describedby={helperId}
          value={text}
          onChange={setText}
          onKeyDown={sendOnEnter}
          size="lg"
          rows={1}
          maxRows={6}
        />
        <Button type="submit" variant="primary" size="lg">
          Send
        </Button>
      </div>
      <p id={helperId} className="message-box-helper">
        Enter to send, Shift+Enter for a new line
      </p>
    </form>
  );
}
