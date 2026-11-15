import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { IconButton } from "../IconButton/IconButton";
import { STATUS_ICONS, liveRole, type Status } from "../status";
import "./Alert.css";

export type AlertStatus = Status;

/** primary makes the action a Primary button and the other one Secondary, such as Allow beside Deny. */
type ActionBase = { label: string; primary?: boolean };
/** loading shows a spinner and ignores clicks while the action runs, such as Refresh status. */
type ButtonAction = ActionBase & { onClick: () => void; loading?: boolean };
type LinkAction = ActionBase & { href: string; newTab?: boolean };
export type AlertAction = ButtonAction | LinkAction;

interface AlertProps {
  status: AlertStatus;
  title?: string;
  children: ReactNode;
  detail?: string;
  actions?: [AlertAction] | [AlertAction, AlertAction];
  onDismiss?: () => void;
}

const actionProps = (action: AlertAction) => {
  if ("onClick" in action)
    return { onClick: action.onClick, loading: action.loading };
  return action.newTab
    ? { href: action.href, target: "_blank", rel: "noopener noreferrer" }
    : { href: action.href };
};

const actionVariant = (
  action: AlertAction,
  index: number,
  actions: AlertAction[],
): ButtonVariant => {
  if (action.primary) return "primary";
  return index === 0 || actions.some((other) => other.primary)
    ? "secondary"
    : "ghost";
};

export function Alert({
  status,
  title,
  children,
  detail,
  actions,
  onDismiss,
}: AlertProps) {
  return (
    <div className={`ns-alert ns-alert--${status}`} role={liveRole(status)}>
      <span className="ns-alert-icon">
        <Icon name={STATUS_ICONS[status]} size="md" />
      </span>
      <div className="ns-alert-body">
        {title && <p className="ns-alert-title">{title}</p>}
        <div className="ns-alert-message">{children}</div>
        {detail && <code className="ns-alert-detail">{detail}</code>}
        {actions && (
          <div className="ns-alert-actions">
            {actions.map((action, index) => (
              <Button
                key={action.label}
                {...actionProps(action)}
                size="sm"
                variant={actionVariant(action, index, actions)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {onDismiss && (
        <IconButton
          icon="close"
          label="Dismiss"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        />
      )}
    </div>
  );
}
