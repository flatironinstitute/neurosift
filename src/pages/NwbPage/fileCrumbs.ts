import type { Crumb } from "@ui";

interface FileCrumbsInput {
  base: string;
  archive?: "DANDI" | "EMBER";
  dandisetId?: string;
  /** The file’s path inside the Dandiset, such as sub-1/sub-1_ses-1_ecephys+image.nwb. */
  assetPath?: string;
  nwbUrl: string;
}

/** Where the open file sits: archive, Dandiset, folders, then the file itself. */
export function fileCrumbs({
  base,
  archive,
  dandisetId,
  assetPath,
  nwbUrl,
}: FileCrumbsInput): Crumb[] {
  const fileName =
    (assetPath ?? new URL(nwbUrl).pathname).split("/").filter(Boolean).pop() ??
    nwbUrl;
  if (!archive || !dandisetId) return [{ label: fileName, code: true }];
  const archivePage = archive === "DANDI" ? "dandi" : "ember";
  const dandisetPage = archive === "DANDI" ? "dandiset" : "ember-dandiset";
  const folders = (assetPath ?? "").split("/").slice(0, -1).filter(Boolean);
  return [
    { label: archive, href: `${base}${archivePage}` },
    {
      label: `Dandiset ${dandisetId}`,
      href: `${base}${dandisetPage}/${dandisetId}`,
    },
    ...folders.map((folder) => ({ label: folder, code: true })),
    { label: assetPath ? fileName : "This file", code: Boolean(assetPath) },
  ];
}

/** The asset id in a DANDI or EMBER download address, if there is one. */
export function assetIdOf(nwbUrl: string): string | undefined {
  return nwbUrl.match(/\/api\/assets\/([0-9a-f-]{36})\/download/)?.[1];
}
