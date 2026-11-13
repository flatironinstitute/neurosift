import { useLayoutEffect, useRef } from "react";

/** Sets CSS custom properties on an element, for sizes and colors only known at run time. */
export function useCssVars<T extends HTMLElement>(
  vars: Record<string, string | number>,
) {
  const ref = useRef<T>(null);
  const key = JSON.stringify(vars);
  useLayoutEffect(() => {
    for (const [name, value] of Object.entries(vars))
      ref.current?.style.setProperty(
        name,
        typeof value === "number" ? `${value}px` : value,
      );
    // vars is compared through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ref;
}
