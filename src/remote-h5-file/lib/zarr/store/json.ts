/**
 * Python writes the numbers that are not finite as the bare words NaN,
 * Infinity, and -Infinity, which JSON does not have and JSON.parse refuses.
 * zarr-python writes them in attributes, and NWB files have them: a
 * TimeSeries whose resolution is unknown says "resolution": NaN.
 */

// A string is matched whole, so that the words are only found outside of one
const TOKENS = /"(?:[^"\\]|\\.)*"|-?Infinity|NaN/g;
const NON_FINITE: Record<string, number> = {
  NaN: Number.NaN,
  Infinity: Infinity,
  "-Infinity": -Infinity,
};
const MARK = "@@zarrshadow-non-finite@@";

const mayHaveTokens = (text: string) =>
  text.includes("NaN") || text.includes("Infinity");

/**
 * The same JSON with each bare NaN, Infinity, and -Infinity as a string,
 * which is how Zarr v3 writes a fill value that is not finite. Any JSON
 * parser reads the result.
 */
export function toStrictJson(text: string): string {
  if (!mayHaveTokens(text)) return text;
  return text.replace(TOKENS, (token) =>
    token.startsWith('"') ? token : `"${token}"`,
  );
}

/** JSON.parse that also reads bare NaN, Infinity, and -Infinity, as those numbers. */
export function parseJson(text: string): unknown {
  if (!mayHaveTokens(text)) return JSON.parse(text);
  const marked = text.replace(TOKENS, (token) =>
    token.startsWith('"') ? token : `"${MARK}${token}"`,
  );
  return JSON.parse(marked, (_, value) =>
    typeof value === "string" && value.startsWith(MARK)
      ? NON_FINITE[value.slice(MARK.length)]
      : value,
  );
}
