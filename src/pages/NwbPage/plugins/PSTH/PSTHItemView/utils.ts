import pako from "pako";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type StateType = { [key: string]: any };

export const encodeStateToString = (state: StateType): string => {
  const json = JSON.stringify(state);
  const jsonGzip = pako.gzip(json);
  const base64 = encodeUint8ArrayToBase64(jsonGzip);
  const base64UrlEncoded = encodeURIComponent(base64);
  return base64UrlEncoded;
};

export const decodeStateFromStateString = (
  stateString: string,
): StateType | undefined => {
  try {
    let base64UrlEncoded = decodeURIComponent(stateString);
    base64UrlEncoded = base64UrlEncoded.replace(/ /g, "+");
    const jsonGzip = decodeBase64ToArrayBuffer(base64UrlEncoded);
    const json = pako.ungzip(jsonGzip, { to: "string" });
    return JSON.parse(json) as StateType;
  } catch (err: unknown) {
    console.error(
      "Error decoding state string:",
      err instanceof Error ? err.message : String(err),
    );
    return undefined;
  }
};

const encodeUint8ArrayToBase64 = (array: Uint8Array): string => {
  let binary = "";
  const length = array.byteLength;
  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
};

const decodeBase64ToArrayBuffer = (base64: string): Uint8Array => {
  const binary_string = window.atob(base64);
  const bytes = new Uint8Array(binary_string.length);
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};
