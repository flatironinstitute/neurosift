import { useEffect, useRef, type RefObject } from "react";

/**
 * Opens a native <dialog> as a modal while `open` is true, so focus is trapped and the page is inert.
 * Focus goes to the first field, or else the title, and returns to whatever had it before.
 */
export function useModalDialog(
  dialog: RefObject<HTMLDialogElement | null>,
  title: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    opener.current = document.activeElement as HTMLElement | null;
    if (!element.open) element.showModal();
    const field = element.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    (field ?? title.current)?.focus();
    return () => {
      if (element.open) element.close();
      opener.current?.focus();
    };
  }, [dialog, title, open]);
}
