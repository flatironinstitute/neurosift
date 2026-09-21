/**
 * Query-string watermark for the requests neurosift makes to object stores
 * (DANDI's S3 buckets, OpenNeuro's S3 bucket, the LINDI index on R2, ...).
 *
 * Bucket access logs record the request URI including its query string, so
 * tagging every object request with a fixed parameter lets a bucket owner
 * attribute that traffic to neurosift. Object stores ignore query parameters
 * they do not recognize, so the tag does not change what is served.
 */
export const REQUEST_WATERMARK_PARAM = "neurosift";
export const REQUEST_WATERMARK_VALUE = "1";
export const REQUEST_WATERMARK = `${REQUEST_WATERMARK_PARAM}=${REQUEST_WATERMARK_VALUE}`;

// Parameter names that only make sense on a presigned url: the signature
// itself (SigV4 X-Amz-*, SigV2 AWSAccessKeyId/Signature/Expires) and the
// response-* overrides S3 only honors on signed requests.
const isPresignParamName = (name: string) => {
  const n = name.toLowerCase();
  return (
    n.startsWith("x-amz-") ||
    n.startsWith("response-") ||
    n === "awsaccesskeyid" ||
    n === "signature" ||
    n === "expires"
  );
};

const splitUrl = (url: string) => {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = withoutHash.indexOf("?");
  const base = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const query = qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "";
  return { base, query, hash };
};

const queryParamNames = (query: string) =>
  query
    .split("&")
    .filter((kv) => kv !== "")
    .map((kv) => {
      const name = kv.split("=")[0];
      try {
        return decodeURIComponent(name);
      } catch {
        return name;
      }
    });

/**
 * A presigned S3 url. Its signature covers the whole query string, so a
 * parameter cannot be added to it without invalidating it.
 */
export const isPresignedUrl = (url: string): boolean => {
  const { query } = splitUrl(url);
  return queryParamNames(query).some((n) => {
    const l = n.toLowerCase();
    return l === "x-amz-signature" || l === "signature";
  });
};

// The local file server started by `neurosift view-nwb` (and anything else on
// the loopback interface) is not an object store; leave those urls alone.
const isLoopbackUrl = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(url);

/**
 * The url with the neurosift watermark appended to its query string.
 *
 * Returns the url unchanged when it is not an http(s) url, points at the
 * loopback interface, already carries the watermark, or is presigned (see
 * isPresignedUrl). Idempotent, so it is safe to apply at more than one layer.
 */
export const addRequestWatermark = (url: string): string => {
  if (!/^https?:\/\//i.test(url)) return url;
  if (isLoopbackUrl(url)) return url;
  if (isPresignedUrl(url)) return url;
  const { base, query, hash } = splitUrl(url);
  if (queryParamNames(query).includes(REQUEST_WATERMARK_PARAM)) return url;
  const params = query.split("&").filter((kv) => kv !== "");
  params.push(REQUEST_WATERMARK);
  return `${base}?${params.join("&")}${hash}`;
};

/**
 * The bare object url behind a presigned one: the signing parameters and the
 * response-* overrides are dropped, other parameters (e.g. versionId) kept.
 * Reading from it only works for objects that allow anonymous access.
 */
export const stripPresignParams = (url: string): string => {
  const { base, query, hash } = splitUrl(url);
  if (!query) return url;
  const kept = query.split("&").filter((kv) => {
    if (kv === "") return false;
    const name = kv.split("=")[0];
    let decoded = name;
    try {
      decoded = decodeURIComponent(name);
    } catch {
      // keep the raw name
    }
    return !isPresignParamName(decoded);
  });
  return kept.length > 0
    ? `${base}?${kept.join("&")}${hash}`
    : `${base}${hash}`;
};
