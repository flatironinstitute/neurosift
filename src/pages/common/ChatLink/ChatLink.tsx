import { Badge } from "@ui";
import type { ReactNode } from "react";
import "./ChatLink.css";

/** A link that opens a chat in a new tab, marked Experimental. */
export default function ChatLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <p className="chat-link">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
      <Badge status="info">Experimental</Badge>
    </p>
  );
}
