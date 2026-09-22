import { describe, expect, it } from "vitest";
import {
  addRequestWatermark,
  isPresignedUrl,
  REQUEST_WATERMARK,
  stripPresignParams,
} from "./requestWatermark";

const blob =
  "https://dandiarchive.s3.amazonaws.com/blobs/645/10d/64510d67-fab1-45ab-abc3-b18c9738412c";
const presigned =
  blob +
  "?response-content-disposition=attachment%3B%20filename%3D%22sub-1.nwb%22" +
  "&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA%2F20250101%2Fus-east-2%2Fs3%2Faws4_request" +
  "&X-Amz-Date=20250101T000000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123";

describe("addRequestWatermark", () => {
  it("appends the watermark to a url without a query string", () => {
    expect(addRequestWatermark(blob)).toBe(`${blob}?${REQUEST_WATERMARK}`);
  });

  it("appends with & when the url already has a query string", () => {
    const url =
      "https://s3.amazonaws.com/openneuro.org/ds003374/sub-01/ieeg/sub-01_ieeg.edf?versionId=fmme9zou6CJ";
    expect(addRequestWatermark(url)).toBe(`${url}&${REQUEST_WATERMARK}`);
  });

  it("keeps a fragment after the query string", () => {
    expect(addRequestWatermark("https://x/y.json#frag")).toBe(
      `https://x/y.json?${REQUEST_WATERMARK}#frag`,
    );
  });

  it("is idempotent", () => {
    const once = addRequestWatermark(blob);
    expect(addRequestWatermark(once)).toBe(once);
  });

  it("does not touch a presigned url, whose signature covers the query", () => {
    expect(addRequestWatermark(presigned)).toBe(presigned);
    const sigV2 = `${blob}?AWSAccessKeyId=AKIA&Expires=1&Signature=s`;
    expect(addRequestWatermark(sigV2)).toBe(sigV2);
  });

  it("leaves loopback and non-http urls alone", () => {
    for (const url of [
      "http://localhost:5173/file.nwb",
      "http://localhost/file.nwb",
      "http://127.0.0.1:8080/file.nwb",
      "blob:https://neurosift.app/abc",
      "data:text/plain,hi",
      "relative/path.nwb",
    ]) {
      expect(addRequestWatermark(url)).toBe(url);
    }
  });

  it("does not mistake a similar hostname for loopback", () => {
    const url = "https://localhost.example.org/file.nwb";
    expect(addRequestWatermark(url)).toBe(`${url}?${REQUEST_WATERMARK}`);
  });
});

describe("isPresignedUrl", () => {
  it("detects SigV4 and SigV2 signatures", () => {
    expect(isPresignedUrl(presigned)).toBe(true);
    expect(isPresignedUrl(`${blob}?AWSAccessKeyId=a&Signature=b`)).toBe(true);
  });

  it("is false for plain and versioned urls", () => {
    expect(isPresignedUrl(blob)).toBe(false);
    expect(isPresignedUrl(`${blob}?versionId=1&${REQUEST_WATERMARK}`)).toBe(
      false,
    );
  });
});

describe("stripPresignParams", () => {
  it("drops the signing and response-* parameters", () => {
    expect(stripPresignParams(presigned)).toBe(blob);
  });

  it("keeps unrelated parameters such as versionId", () => {
    expect(
      stripPresignParams(`${blob}?versionId=7&X-Amz-Signature=abc&Expires=1`),
    ).toBe(`${blob}?versionId=7`);
  });

  it("returns a url without a query string unchanged", () => {
    expect(stripPresignParams(blob)).toBe(blob);
  });
});
