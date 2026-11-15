import type { Crumb } from "@ui";
import { locationSearch } from "../common/DatasetWorkspace/folderLocation";

interface FileCrumbsInput {
  base: string;
  archive?: "DANDI" | "EMBER";
  dandisetId?: string;
  /** Kept on folder links, so they open the same version. */
  dandisetVersion?: string;
  /** The file’s path inside the Dandiset, such as sub-1/sub-1_ses-1_ecephys+image.nwb. */
  assetPath?: string;
  nwbUrl: string;
}

/** Where the open file sits: archive, Dandiset, folders, then the file itself. */
export function fileCrumbs({
  base,
  archive,
  dandisetId,
  dandisetVersion,
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
  const version = dandisetVersion ? `dandisetVersion=${dandisetVersion}` : "";
  const dandisetHref = `${base}${dandisetPage}/${dandisetId}`;
  return [
    { label: archive, href: `${base}${archivePage}` },
    {
      label: `Dandiset ${dandisetId}`,
      href: dandisetHref,
    },
    ...folders.map((folder, index) => ({
      label: folder,
      href: `${dandisetHref}${locationSearch(version, folders.slice(0, index + 1).join("/"))}`,
      code: true,
    })),
    { label: assetPath ? fileName : "This file", code: Boolean(assetPath) },
  ];
}

/** The asset id in a DANDI or EMBER download address, if there is one. */
export function assetIdOf(nwbUrl: string): string | undefined {
  return nwbUrl.match(/\/api\/assets\/([0-9a-f-]{36})\/download/)?.[1];
}
