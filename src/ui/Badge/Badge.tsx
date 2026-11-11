import type { AnchorHTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import { STATUS_ICONS, type Status } from "../status";
import "./Badge.css";

export type BadgeStatus = "neutral" | Status | "count";

interface BadgeProps {
  status: BadgeStatus;
  /** Add the status icon when the badge stands alone, away from text that explains it. */
  icon?: boolean;
  children: string;
}

/** A short, read-only label about an item: its status or a count. Never clickable. */
export function Badge({ status, icon = false, children }: BadgeProps) {
  const name: IconName | null =
    status === "count"
      ? null
      : status === "neutral"
        ? "information"
        : STATUS_ICONS[status];
  return (
    <span className={`ns-badge ns-badge--${status}`}>
      {icon && name && <Icon name={name} />}
      {children}
    </span>
  );
}

interface TagLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "className" | "style" | "children"
> {
  href: string;
  icon?: IconName;
  children: string;
}

/** A value people can jump to, such as a recent Dandiset: a real link in the code face. */
export function TagLink({ icon, children, ...link }: TagLinkProps) {
  return (
    <a {...link} className="ns-tag ns-tag--link">
      {icon && <Icon name={icon} />}
      {children}
    </a>
  );
}

/** A read-only value from the data, such as a neurodata type. */
export function Tag({ children }: { children: string }) {
  return <span className="ns-tag ns-tag--static">{children}</span>;
}
