import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { Toast } from "./Toast";
import { ToastContext, type ToastOptions } from "./toastContext";

const DURATION = 4000;

interface Current extends ToastOptions {
  id: number;
}

/** Holds the app's one toast and its region, which stays in the page so screen readers announce each toast. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Current | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const nextId = useRef(0);

  const show = useCallback(
    (options: ToastOptions) => setToast({ ...options, id: ++nextId.current }),
    [],
  );
  const dismiss = useCallback(() => {
    if (region.current?.contains(document.activeElement))
      returnFocus.current?.focus();
    setFocused(false);
    setToast(null);
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  useEffect(() => region.current!.showPopover(), []);

  const leaves = toast && toast.status !== "error" && !toast.busy;
  useEffect(() => {
    if (!leaves || hovered || focused) return;
    const timer = setTimeout(dismiss, DURATION);
    return () => clearTimeout(timer);
  }, [toast, leaves, hovered, focused, dismiss]);

  const outside = (event: FocusEvent) =>
    !region.current?.contains(event.relatedTarget as Node | null);
  const onFocus = (event: FocusEvent) => {
    if (!outside(event)) return;
    if (event.relatedTarget instanceof HTMLElement)
      returnFocus.current = event.relatedTarget;
    setFocused(true);
  };
  const onBlur = (event: FocusEvent) => {
    if (outside(event)) setFocused(false);
  };

  const view = toast && (
    <Toast
      key={toast.id}
      {...toast}
      action={
        toast.action && {
          label: toast.action.label,
          onClick: () => {
            toast.action!.onClick();
            dismiss();
          },
        }
      }
      onDismiss={dismiss}
    />
  );
  const urgent = toast?.status === "error";

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={region}
        popover="manual"
        className="ns-toast-region"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div role="status">{!urgent && view}</div>
        <div role="alert">{urgent && view}</div>
      </div>
    </ToastContext.Provider>
  );
}
