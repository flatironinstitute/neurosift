// URL checks for Zarr stores, kept apart from RemoteH5FileZarr so that pages
// can recognize a Zarr url without loading the Zarr reader (and zarrita).

/**
 * Whether a url names a Zarr store: a folder whose name ends in .zarr, or a
 * Zarr asset in a DANDI bucket, which is at /zarr/<id>/.
 */
export const isZarrUrl = (url: string) => {
  const u = url.split("?")[0].replace(/\/+$/, "");
  return u.endsWith(".zarr") || /\/zarr\/[0-9a-f-]{36}$/.test(u);
};

/**
 * Whether a url names a shadowzarr reference file or the folder that holds one.
 * Files named before shadowzarr was renamed from zarrshadow end in .zarrshadow.
 */
export const isShadowZarrUrl = (url: string) => {
  const u = url.split("?")[0].replace(/\/+$/, "");
  return (
    u.endsWith(".shadowzarr") ||
    u.endsWith(".shadowzarr.json") ||
    u.endsWith(".zarrshadow") ||
    u.endsWith(".zarrshadow.json") ||
    u.endsWith("/refs.json")
  );
};
