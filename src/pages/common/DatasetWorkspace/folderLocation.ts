import type { Crumb } from "@ui";
import { DatasetFile } from "./plugins/pluginInterface";

/** The URL parameter that holds the open folder, as on dandiarchive.org. */
export const LOCATION_PARAM = "location";
export const ROOT_LABEL = "All files";

/** A folder path from the URL, "" for the root, or null when it climbs with . or .. */
export function parseLocation(raw: string | null): string | null {
  const parts = (raw ?? "").split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) return null;
  return parts.join("/");
}

export const joinLocation = (folder: string, name: string) =>
  folder ? `${folder}/${name}` : name;

export const parentLocation = (path: string) =>
  path.split("/").slice(0, -1).join("/");

/** The query string with location set to path, or without it at the root. */
export function locationSearch(search: string, path: string): string {
  const params = new URLSearchParams(search);
  if (path) params.set(LOCATION_PARAM, path);
  else params.delete(LOCATION_PARAM);
  // Slashes read better unencoded and are allowed in a query.
  return `?${params.toString().replace(/%2F/gi, "/")}`;
}

/** All files, then each folder down to the open one, which is last. */
export function folderCrumbs(
  path: string,
  hrefFor: (path: string) => string,
): Crumb[] {
  const parts = path ? path.split("/") : [];
  return [
    { label: ROOT_LABEL, href: hrefFor("") },
    ...parts.map((part, index) => ({
      label: part,
      href: hrefFor(parts.slice(0, index + 1).join("/")),
      code: true,
    })),
  ];
}

/** Finds a folder's contents by walking down from the top level by name; null if it isn't there. */
export async function findFolder(
  path: string,
  topLevelFiles: DatasetFile[],
  fetchDirectory: (folder: DatasetFile) => Promise<DatasetFile[]>,
): Promise<DatasetFile[] | null> {
  let files = topLevelFiles;
  for (const name of path ? path.split("/") : []) {
    const folder = files.find((f) => f.directory && f.filename === name);
    if (!folder) return null;
    files = await fetchDirectory(folder);
  }
  return files;
}
