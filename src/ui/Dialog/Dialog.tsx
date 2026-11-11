import { useId, useRef, type ReactNode } from "react";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";
import { dismissHandlers } from "./dismissHandlers";
import { useModalDialog } from "./useModalDialog";
import "./Dialog.css";

interface DialogProps {
  open: boolean;
  /** Called for Escape, the × and Cancel: close without changes. */
  onClose: () => void;
  /** A question for a decision, a task for a task. */
  title: string;
  /** The message, and any content such as a field. */
  children: ReactNode;
  /** The verb from the title, never OK or Yes. */
  confirmLabel: string;
  onConfirm: () => void;
  /** Disables the main action until the task can be done, such as Save with no key. */
  confirmDisabled?: boolean;
  size?: "sm" | "md";
  kind?: "default" | "destructive";
}

/** Pauses the page for one decision or one short task. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  size = "md",
  kind = "default",
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useModalDialog(dialog, heading, open);
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={`ns-dialog ns-dialog--${size}`}
      {...dismissHandlers(onClose)}
    >
      <div className="ns-dialog-header">
        <h2
          id={titleId}
          ref={heading}
          tabIndex={-1}
          className="ns-dialog-title"
        >
          {title}
        </h2>
        <IconButton
          icon="close"
          label="Close"
          variant="ghost"
          tooltip={false}
          onClick={onClose}
        />
      </div>
      <div className="ns-dialog-body">{children}</div>
      <div className="ns-dialog-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={kind === "destructive" ? "destructive" : "primary"}
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
