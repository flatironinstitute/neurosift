import { useEffect, useState } from "react";
import { assetIdOf } from "./fileCrumbs";

/** The open file’s path inside its Dandiset, from the archive’s asset record. */
export function useAssetPath(nwbUrl: string): string | undefined {
  const [path, setPath] = useState<string>();
  useEffect(() => {
    const id = assetIdOf(nwbUrl);
    if (!id) return;
    let canceled = false;
    fetch(`${new URL(nwbUrl).origin}/api/assets/${id}/`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((asset) => {
        if (!canceled && typeof asset?.path === "string") setPath(asset.path);
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [nwbUrl]);
  return path;
}
