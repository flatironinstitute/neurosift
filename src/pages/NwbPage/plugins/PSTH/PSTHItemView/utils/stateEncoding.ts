import pako from "pako";
import {
  encodeUint8ArrayToBase64,
  decodeBase64ToArrayBuffer,
} from "./base64Utils";

export const encodeStateToString = (state: { [key: string]: any }): string => {
  // json stringify, gzip, base64, url encode
  const json = JSON.stringify(state);
  const jsonGzip = pako.gzip(json);
  const base64 = encodeUint8ArrayToBase64(jsonGzip);
  const base64UrlEncoded = encodeURIComponent(base64);
  return base64UrlEncoded;
};

export const decodeStateFromStateString = (
  stateString: string,
): { [key: string]: any } | undefined => {
  // base64, gunzip, json parse
  try {
    let base64UrlEncoded = decodeURIComponent(stateString);
    // replace space by + because the browser may have replaced + by space
    base64UrlEncoded = base64UrlEncoded.replace(/ /g, "+");
    const jsonGzip = decodeBase64ToArrayBuffer(base64UrlEncoded);
    const json = pako.ungzip(jsonGzip, { to: "string" });
    return JSON.parse(json) as { [key: string]: any };
  } catch (err: any) {
    console.error(`Error decoding state string: ${err.message}`);
    return undefined;
  }
};
