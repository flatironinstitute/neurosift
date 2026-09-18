import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Exercise the redirect script embedded in the Pages-root 404.html by running
// it against a stubbed window.location. The important property is that it
// never sends the browser somewhere that would land it back here: the app root
// it redirects to can itself be missing (a preview that is still building, was
// cleaned up, or never existed), and a self-redirect loop grows the URL
// without bound and hangs the tab.
const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "404.html"),
  "utf-8",
);
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

const HOST = "codycbakerphd.github.io";

const run = (pathname: string, search = "", hash = "") => {
  const redirects: string[] = [];
  const location = {
    protocol: "https:",
    host: HOST,
    pathname,
    search,
    hash,
    replace: (url: string) => redirects.push(url),
  };
  const win: Record<string, unknown> = { location };
  new Function("window", script as string)(win);
  return {
    redirect: redirects[0] ?? null,
    appRoot: win.__notFoundAppRoot as string | undefined,
  };
};

// Follow the script's own redirects, pretending every target 404s too.
const followAll = (pathname: string, search = "", maxRounds = 20) => {
  const visited: string[] = [];
  for (let i = 0; i < maxRounds; i++) {
    const { redirect } = run(pathname, search);
    if (!redirect) return { visited, looped: false };
    visited.push(redirect);
    const url = new URL(redirect);
    pathname = url.pathname;
    search = url.search;
  }
  return { visited, looped: true };
};

describe("Pages-root 404 redirect", () => {
  it("restores a deep link under a preview build", () => {
    const { redirect } = run(
      "/neurosift/previews/my-branch/nwb",
      "?url=https://example.com/x.nwb&tab=main",
    );
    expect(redirect).toBe(
      `https://${HOST}/neurosift/previews/my-branch/?/nwb&url=https://example.com/x.nwb~and~tab=main`,
    );
  });

  it("restores a deep link at the site root", () => {
    const { redirect } = run("/neurosift/dandiset/000001", "?v=draft");
    expect(redirect).toBe(
      `https://${HOST}/neurosift/?/dandiset/000001&v=draft`,
    );
  });

  it("handles a pr-preview prefix the same way", () => {
    const { redirect } = run("/neurosift/pr-preview/pr-42/settings");
    expect(redirect).toBe(
      `https://${HOST}/neurosift/pr-preview/pr-42/?/settings`,
    );
  });

  it("does not redirect a missing preview root to itself", () => {
    // The directory that just 404'd IS the redirect target, so bouncing there
    // only 404s again. This is the case that used to spin forever.
    const { redirect, appRoot } = run("/neurosift/previews/my-branch/");
    expect(redirect).toBeNull();
    expect(appRoot).toBe("/neurosift/previews/my-branch/");
  });

  it("does not redirect again once its own marker query is present", () => {
    const { redirect } = run(
      "/neurosift/previews/my-branch/",
      "?/nwb&url=https://example.com/x.nwb",
    );
    expect(redirect).toBeNull();
  });

  it("terminates when the app root is missing too", () => {
    // Every target 404s; the script must give up rather than accumulate
    // "~and~" segments forever.
    expect(
      followAll("/neurosift/previews/my-branch/nwb", "?url=x").looped,
    ).toBe(false);
    expect(followAll("/neurosift/previews/my-branch/").looped).toBe(false);
    expect(followAll("/neurosift/nwb", "?url=x&tab=main").looped).toBe(false);
  });
});
