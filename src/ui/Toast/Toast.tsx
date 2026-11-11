import { Icon } from "../Icon/Icon";
import { IconButton } from "../IconButton/IconButton";
import { Spinner } from "../Spinner/Spinner";
import { STATUS_ICONS } from "../status";
import "./Toast.css";

export type ToastStatus = "neutral" | "success" | "error";

export interface ToastProps {
  message: string;
  status?: ToastStatus;
  busy?: boolean;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
}

export function Toast({
  message,
  status = "neutral",
  busy = false,
  action,
  onDismiss,
}: ToastProps) {
  const icon = status === "neutral" ? null : STATUS_ICONS[status];
  return (
    <div className={`ns-toast ns-toast--${status}`}>
      {busy ? (
        <Spinner />
      ) : (
        icon && (
          <span className="ns-toast-icon">
            <Icon name={icon} />
          </span>
        )
      )}
      <p className="ns-toast-message">{message}</p>
      {action && (
        <button
          type="button"
          className="ns-toast-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      <IconButton
        icon="close"
        label="Dismiss"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
      />
    </div>
  );
}
