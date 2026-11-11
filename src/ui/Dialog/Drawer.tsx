import { useId, useRef, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import { dismissHandlers } from "./dismissHandlers";
import { useModalDialog } from "./useModalDialog";
import "./Dialog.css";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  /** Docked sits beside the workspace; overlay slides over it, with a backdrop. */
  mode?: "docked" | "overlay";
}

/** A side panel that keeps the data in view. Overlay drawers trap focus; docked ones don't. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "left",
  mode = "overlay",
}: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useModalDialog(dialog, heading, open && mode === "overlay");
  if (!open) return null;

  const content = (
    <>
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
    </>
  );

  if (mode === "docked")
    return (
      <aside
        aria-labelledby={titleId}
        className={`ns-drawer ns-drawer--docked ns-drawer--${side}`}
      >
        {content}
      </aside>
    );
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={`ns-drawer ns-drawer--overlay ns-drawer--${side}`}
      {...dismissHandlers(onClose)}
      // A click on the backdrop lands on the dialog itself, outside its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {content}
    </dialog>
  );
}
