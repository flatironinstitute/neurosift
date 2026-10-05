import { resolveDatasetFileUrl } from "@hdf5Interface";
import { useEffect, useState } from "react";

/**
 * The url to hand to an element that loads a dataset file itself (<img>,
 * <audio>), resolved so embargoed DANDI assets load. Undefined while
 * resolving, or when no url is given.
 */
const useResolvedDatasetFileUrl = (
  url: string | undefined,
): string | undefined => {
  const [resolved, setResolved] = useState<
    { url: string; resolvedUrl: string } | undefined
  >(undefined);
  useEffect(() => {
    if (!url) return;
    let canceled = false;
    resolveDatasetFileUrl(url).then((resolvedUrl) => {
      if (!canceled) setResolved({ url, resolvedUrl });
    });
    return () => {
      canceled = true;
    };
  }, [url]);
  return url && resolved?.url === url ? resolved.resolvedUrl : undefined;
};

export default useResolvedDatasetFileUrl;
