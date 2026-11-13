import { createContext, useCallback, useContext } from "react";

/** The plot's margins around its data area, in pixels. */
export type AxisInsets = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** A plot whose x axis is the shared time window: its element and the margins around the data. */
export type TimeAxisTarget = { element: HTMLElement; insets: AxisInsets };

export const TimeAxisContext = createContext<
  ((target: TimeAxisTarget | null) => void) | undefined
>(undefined);

/** A ref for a plot drawn on the shared time window, so its frame can select time across it. */
export function useTimeAxisRef({ left, right, top, bottom }: AxisInsets) {
  const register = useContext(TimeAxisContext);
  return useCallback(
    (element: HTMLElement | null) =>
      register?.(
        element ? { element, insets: { left, right, top, bottom } } : null,
      ),
    [register, left, right, top, bottom],
  );
}
