const DANDI_DOWNLOAD =
  /^https:\/\/api(\.sandbox)?\.dandiarchive\.org\/api\/assets\/[0-9a-f-]+\/download\/?$/;
const LIFETIME_MS = 10 * 60 * 1000;

/**
 * A URL resolver for DANDI asset download URLs.
 *
 * Such a URL redirects to the file in the archive's bucket. Following the
 * redirect on every range request doubles the requests and runs into the
 * API's rate limit, so the place it leads to is looked up once and reused for
 * ten minutes. Other URLs are returned as they are.
 */
export function dandiUrlResolver(
  fetch_: (input: string, init?: RequestInit) => Promise<Response>,
): (url: string) => string | Promise<string> {
  const resolved = new Map<string, { at: number; url: Promise<string> }>();
  return (url) => {
    if (!DANDI_DOWNLOAD.test(url)) return url;
    const known = resolved.get(url);
    if (known && Date.now() - known.at < LIFETIME_MS) return known.url;
    // The redirect is signed for GET, so a HEAD request to it is refused: ask for one byte
    const target = fetch_(url, { headers: { Range: "bytes=0-0" } }).then(
      async (response) => {
        await response.arrayBuffer();
        if (!response.ok)
          throw new Error(`HTTP ${response.status} resolving ${url}`);
        return response.url || url;
      },
    );
    target.catch(() => resolved.delete(url));
    resolved.set(url, { at: Date.now(), url: target });
    return target;
  };
}
