/** Page Up and Page Down move this many steps. */
export const PAGE_STEPS = 10;

/** Decimal places that match a step: 0.05 shows two, 0.25 two, 1 none. */
export const stepDigits = (step: number) =>
  (String(step).split(".")[1] ?? "").length;

export const formatValue = (value: number, step: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: stepDigits(step),
    maximumFractionDigits: stepDigits(step),
  });

/** A limit as people write it: 0, 1, 4,095. */
export const formatLimit = (value: number) => value.toLocaleString("en-US");

/** Clamped to the limits and snapped to the step, without floating-point dust. */
export const snap = (value: number, min: number, max: number, step: number) => {
  const snapped = min + Math.round((value - min) / step) * step;
  const clamped = Math.min(max, Math.max(min, snapped));
  return Number(clamped.toFixed(stepDigits(step)));
};

/** Reads a typed number, allowing thousands commas; undefined when it isn't one. */
export const parseValue = (text: string) => {
  const n = Number(text.replace(/,/g, "").trim());
  return text.trim() === "" || Number.isNaN(n) ? undefined : n;
};
