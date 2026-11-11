import type { SyntheticEvent } from "react";

/** The close and cancel handlers for a native <dialog>; Escape goes through onClose, not the browser. */
export function dismissHandlers(onClose: () => void) {
  // React passes close and cancel to every dialog around this one, which would close them too.
  const dismiss = (event: SyntheticEvent) => {
    event.stopPropagation();
    onClose();
  };
  return {
    onClose: dismiss,
    onCancel: (event: SyntheticEvent) => {
      event.preventDefault();
      dismiss(event);
    },
  };
}
