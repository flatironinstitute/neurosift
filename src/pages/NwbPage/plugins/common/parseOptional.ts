/** An empty or unreadable field reads as null, a setting that is off. */
export const parseOptional = (text: string): number | null => {
  const n = parseFloat(text);
  return text.trim() === "" || !Number.isFinite(n) ? null : n;
};
