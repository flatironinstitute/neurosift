/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NwbFileContext } from "./NwbFileContext";
import { RemoteH5File, RemoteH5FileLindi } from "../remote-h5-file";

type ProvideNwbFileProps = {
  nwbUrl: string;
  dandisetId: string;
};

const ProvideNwbFile: FunctionComponent<
  PropsWithChildren<ProvideNwbFileProps>
> = ({ nwbUrl, dandisetId, children }) => {
  const nwbFile = useNwbFileFromUrl(nwbUrl, dandisetId);
  const value = useMemo(() => {
    return {
      nwbFile,
      neurodataItems: [],
    };
  }, [nwbFile]);
  if (!nwbFile) {
    return <div>Loading NWB file...</div>;
  }
  return (
    <NwbFileContext.Provider value={value}>{children}</NwbFileContext.Provider>
  );
};

const useNwbFileFromUrl = (nwbUrl: string, dandisetId: string) => {
  const [nwbFile, setNwbFile] = useState<
    RemoteH5File | RemoteH5FileLindi | null
  >(null);
  useEffect(() => {
    getNwbFileFromUrl(nwbUrl, dandisetId).then((val) => {
      setNwbFile(val);
    });
  }, [nwbUrl, dandisetId]);
  return nwbFile;
};

const nwbFileFromUrlCache: { [key: string]: RemoteH5File | RemoteH5FileLindi } =
  {};

const getNwbFileFromUrl = async (nwbUrl: string, dandisetId: string) => {
  if (nwbFileFromUrlCache[nwbUrl]) {
    return nwbFileFromUrlCache[nwbUrl];
  }
  const lindiUrl = await tryGetLindiUrl(nwbUrl, dandisetId);
  let ret: RemoteH5File | RemoteH5FileLindi;
  if (lindiUrl) {
    ret = await RemoteH5FileLindi.create(lindiUrl);
  } else {
    ret = new RemoteH5File(nwbUrl, {});
  }
  nwbFileFromUrlCache[nwbUrl] = ret;
  return ret;
};

const tryGetLindiUrl = async (url: string, dandisetId: string) => {
  if (url.endsWith(".lindi.json") || url.endsWith(".lindi.tar")) {
    return url;
  }
  let assetId: string;
  let staging: boolean;
  if (url.startsWith("https://api-staging.dandiarchive.org/api/assets/")) {
    staging = true;
    assetId = url.split("/")[5];
  } else if (
    url.startsWith("https://api-staging.dandiarchive.org/api/dandisets/")
  ) {
    staging = true;
    dandisetId = url.split("/")[5];
    const indexOfAssetsPart = url.split("/").indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = url.split("/")[indexOfAssetsPart + 1];
  } else if (url.startsWith("https://api.dandiarchive.org/api/assets/")) {
    staging = false;
    assetId = url.split("/")[5];
  } else if (url.startsWith("https://api.dandiarchive.org/api/dandisets/")) {
    // https://api.dandiarchive.org/api/dandisets/000246/versions/draft/assets/24190f91-44ae-4e77-8581-19dcc567a161/download/
    staging = false;
    dandisetId = url.split("/")[5];
    const indexOfAssetsPart = url.split("/").indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = url.split("/")[indexOfAssetsPart + 1];
  } else {
    return undefined;
  }
  if (!dandisetId) return undefined;
  if (!assetId) return undefined;
  const aa = staging ? "dandi-staging" : "dandi";
  const tryUrl = `https://lindi.neurosift.org/${aa}/dandisets/${dandisetId}/assets/${assetId}/nwb.lindi.json`;
  const resp = await fetch(tryUrl, { method: "HEAD" });
  if (resp.ok) return tryUrl;
  return undefined;
};

export default ProvideNwbFile;
