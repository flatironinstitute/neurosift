import { useEffect, useState, type RefObject } from "react";

/** Tracks whether a popover is open and sends focus back to the button that opened it when it closes. */
export function usePopover(
  popover: RefObject<HTMLElement | null>,
  onOpen?: () => void,
): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = popover.current!;
    const onToggle = (event: Event) => {
      const opened = (event as ToggleEvent).newState === "open";
      setOpen(opened);
      if (opened) return onOpen?.();
      // Escape, a pick or Tab leave focus inside or nowhere; WebKit doesn't send it back itself.
      const active = document.activeElement;
      if (element.contains(active) || active === document.body)
        document
          .querySelector<HTMLElement>(`[popovertarget="${element.id}"]`)
          ?.focus();
    };
    element.addEventListener("toggle", onToggle);
    return () => element.removeEventListener("toggle", onToggle);
  }, [popover, onOpen]);
  return open;
}
