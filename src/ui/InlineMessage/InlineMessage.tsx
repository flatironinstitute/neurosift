import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import { STATUS_ICONS, liveRole, type Status } from "../status";
import "../base.css";
import "./InlineMessage.css";

export type InlineMessageStatus = Exclude<Status, "success">;

interface InlineMessageProps {
  status: InlineMessageStatus;
  children: ReactNode;
}

export function InlineMessage({ status, children }: InlineMessageProps) {
  return (
    <div
      className={`ns-inline-message ns-inline-message--${status}`}
      role={liveRole(status)}
    >
      <Icon name={STATUS_ICONS[status]} />
      <span>{children}</span>
    </div>
  );
}
