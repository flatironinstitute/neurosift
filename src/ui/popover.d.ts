// React 18's types predate the popover attributes; React passes lowercase attributes through.
import "react";

declare module "react" {
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    popover?: "auto" | "manual";
  }
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    popovertarget?: string;
    popoverTarget?: string;
  }
}

declare global {
  // Opening a popover from a source anchors it to that element.
  interface HTMLElement {
    showPopover(options?: { source?: HTMLElement }): void;
  }
}
