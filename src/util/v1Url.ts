/** The same page in Neurosift v1, where v1 has one: DANDI search, a Dandiset or an NWB file. */
export function v1Url(path: string, search: string): string {
  const base = "https://v1.neurosift.app";
  if (path === "/dandi") return `${base}?p=/dandi`;
  if (path.startsWith("/dandiset/"))
    return `${base}?p=/dandiset&dandisetId=${path.split("/").pop()}`;
  if (path === "/nwb") return `${base}?p=/nwb${search.replace("?", "&")}`;
  return base;
}
