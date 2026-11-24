import { Badge, Drawer, IconButton } from "@ui";
import { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";

type ChatPanelProps = {
  /** The embedded chat's address. */
  src: string;
  /** Names the chat for screen readers, such as Dandiset 000673. */
  subject: string;
  mode: "docked" | "overlay";
  onClose: () => void;
  /** A link to Neurosift in an answer. */
  onOpenLink: (href: string) => void;
};

/** Messages the embedded chat sends (qp's embed.ts). */
type FromChat =
  | { source: "neurosift-chat"; type: "open-link"; href: string }
  | { source: "neurosift-chat"; type: "chat"; href: string; empty: boolean };

/** Chat in a side panel: the embedded chat, with New chat and Open in full page in the header. */
export function ChatPanel({
  src,
  subject,
  mode,
  onClose,
  onOpenLink,
}: ChatPanelProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [chat, setChat] = useState<{ href?: string; empty: boolean }>({
    empty: true,
  });
  const origin = new URL(src).origin;

  useEffect(() => {
    const listener = (event: MessageEvent<FromChat>) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.origin !== origin || event.data?.source !== "neurosift-chat")
        return;
      if (event.data.type === "chat")
        setChat({ href: event.data.href, empty: event.data.empty });
      if (event.data.type === "open-link") onOpenLink(event.data.href);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [origin, onOpenLink]);

  const newChat = () =>
    frame.current?.contentWindow?.postMessage(
      { source: "neurosift-host", type: "new-chat" },
      origin,
    );

  return (
    <Drawer
      open
      mode={mode}
      side="right"
      title="Chat"
      badge={<Badge status="info">Experimental</Badge>}
      actions={
        <>
          <IconButton
            icon="add"
            label="New chat"
            variant="ghost"
            disabled={chat.empty}
            onClick={newChat}
          />
          <IconButton
            icon="launch"
            label="Open in full page"
            variant="ghost"
            disabled={!chat.href}
            onClick={() =>
              chat.href && window.open(chat.href, "_blank", "noopener")
            }
          />
        </>
      }
      flush
      onClose={onClose}
    >
      <iframe
        ref={frame}
        className="chat-panel-frame"
        src={src}
        title={`Chat about ${subject}`}
      />
    </Drawer>
  );
}
