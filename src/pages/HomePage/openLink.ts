export type LinkTarget =
  | { kind: "text" }
  | { kind: "file"; path: string }
  | { kind: "dataset"; path: string; message: string }
  | { kind: "unsupported" };

const FILE =
  /(\.nwb|\.nwb\.lindi\.json|\.lindi\.json|\.lindi\.tar|\.zarr\/?)$/i;
const ASSET = /\/api\/assets\/[0-9a-f-]{36}\/download\/?$/i;

/** Where a pasted link leads in Neurosift: a file, a dataset page, or nowhere it can open. */
export function linkTarget(text: string): LinkTarget {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return { kind: "text" };
  }
  if (!/^https?:$/.test(url.protocol)) return { kind: "text" };
  const dandiset = /^\/dandiset\/(\d{6})/.exec(url.pathname);
  if (dandiset && url.hostname.endsWith("dandiarchive.org"))
    return {
      kind: "dataset",
      path: `dandiset/${dandiset[1]}`,
      message:
        "This link is a Dandiset page, not a file. Opening the Dandiset instead.",
    };
  if (dandiset && url.hostname.endsWith("emberarchive.org"))
    return {
      kind: "dataset",
      path: `ember-dandiset/${dandiset[1]}`,
      message:
        "This link is a Dandiset page, not a file. Opening the Dandiset instead.",
    };
  const openNeuro = /^\/datasets\/(ds\d+)/.exec(url.pathname);
  if (openNeuro && url.hostname.endsWith("openneuro.org"))
    return {
      kind: "dataset",
      path: `openneuro-dataset/${openNeuro[1]}`,
      message:
        "This link is an OpenNeuro dataset page, not a file. Opening the dataset instead.",
    };
  if (FILE.test(url.pathname) || ASSET.test(url.pathname))
    return {
      kind: "file",
      path: `nwb?${new URLSearchParams({ url: url.href })}`,
    };
  return { kind: "unsupported" };
}
