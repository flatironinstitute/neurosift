import { useEffect, useRef, useState } from "react";

export type LoadingPhase = "hidden" | "loading" | "slow";

const SHOW_AFTER = 300;
const HOLD_FOR = 500;
const SLOW_AFTER = 15_000;

/** The guideline’s timing: nothing under 300ms, a spinner held at least 500ms, slow after 15 s. */
export function useLoadingPhase(active: boolean): LoadingPhase {
  const [phase, setPhase] = useState<LoadingPhase>("hidden");
  const shownAt = useRef(0);
  useEffect(() => {
    if (active) {
      const show = setTimeout(() => {
        shownAt.current = Date.now();
        setPhase("loading");
      }, SHOW_AFTER);
      const slow = setTimeout(() => setPhase("slow"), SLOW_AFTER);
      return () => {
        clearTimeout(show);
        clearTimeout(slow);
      };
    }
    const left = shownAt.current + HOLD_FOR - Date.now();
    if (left <= 0) {
      setPhase("hidden");
      return;
    }
    const hide = setTimeout(() => setPhase("hidden"), left);
    return () => clearTimeout(hide);
  }, [active]);
  return phase;
}
