import type { ReactNode } from "react";
import { Button } from "../Button/Button";
import { Icon, type IconName } from "../Icon/Icon";
import "../base.css";
import "./EmptyState.css";

type Action = { label: string; onClick: () => void };

interface EmptyStateProps {
  title: string;
  children: ReactNode;
  /** The view’s neurodata type icon. Never an illustration. */
  icon?: IconName;
  action?: Action;
  secondary?: Action;
}

/** What is empty, why, and one way forward, in the space the content would fill. */
export function EmptyState({
  title,
  children,
  icon,
  action,
  secondary,
}: EmptyStateProps) {
  return (
    <div className="ns-empty">
      {icon && (
        <span className="ns-empty-icon">
          <Icon name={icon} size="xl" />
        </span>
      )}
      <p className="ns-empty-title">{title}</p>
      <p className="ns-empty-reason">{children}</p>
      {(action || secondary) && (
        <div className="ns-empty-actions">
          {action && (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondary && (
            <Button variant="ghost" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
