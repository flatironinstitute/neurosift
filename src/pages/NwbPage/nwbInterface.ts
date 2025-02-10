/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Canceler,
  DatasetDataType,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "@remote-h5-file";
import { getCachedObject, setCachedObject } from "./nwbCache";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";
import { removeStatusItem, setStatusItem } from "@components/StatusBarContext";

const nwbFiles: {
  [url: string]: {
    resolvedUrl: string;
    remoteH5File: RemoteH5FileX;
  };
} = {};

// for looking up lindi files
let currentDandisetId = "";
export const setCurrentDandisetId = (dandisetId: string) => {
  currentDandisetId = dandisetId;
};
let tryUsingLindi = true;
export const setTryUsingLindi = (val: boolean) => {
  tryUsingLindi = val;
};
export const isUsingLindi = (url: string) => {
  return nwbFiles[url]?.resolvedUrl.endsWith(".lindi.json");
};

export type NwbSubdataset = {
  name: string;
  path: string;

  shape: number[];
  dtype: string;
  attrs: { [key: string]: any };
};

export type NwbSubgroup = {
  name: string;
  path: string;
  attrs: { [key: string]: any };
};

export type NwbGroup = {
  path: string;
  subgroups: NwbSubgroup[];
  datasets: NwbSubdataset[];
  attrs: { [key: string]: any };
};

export type NwbDataset = {
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: { [key: string]: any };
};

type GlobalStats = {
  numGroups: number;
  numDatasets: number;
  numDatasetDatas: number;
};

const globalStats: GlobalStats = {
  numGroups: 0,
  numDatasets: 0,
  numDatasetDatas: 0,
};

const globalStatsUpdated = () => {
  setStatusItem("nwbStats", {
    type: "text",
    text: `${globalStats.numGroups} / ${globalStats.numDatasets} / ${globalStats.numDatasetDatas}`,
    tooltip: "Number of groups / datasets / dataset data accesses",
  });
  if (
    globalStats.numGroups === 0 &&
    globalStats.numDatasets === 0 &&
    globalStats.numDatasetDatas === 0
  ) {
    removeStatusItem("nwbStats");
  }
};

const inProgressGetRemoteH5Files: { [url: string]: boolean } = {};

const getRemoteH5FileForUrl = async (url: string) => {
  if (!nwbFiles[url]) {
    // If not already created
    if (inProgressGetRemoteH5Files[url]) {
      while (inProgressGetRemoteH5Files[url]) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return nwbFiles[url];
    }
    try {
      inProgressGetRemoteH5Files[url] = true;
      const { url: urlResolved } = await getResolvedUrl(url);
      if (urlResolved.endsWith(".lindi.json")) {
        nwbFiles[url] = {
          resolvedUrl: urlResolved,
          remoteH5File: await RemoteH5FileLindi.create(urlResolved),
        };
      } else {
        nwbFiles[url] = {
          resolvedUrl: urlResolved,
          remoteH5File: new RemoteH5File(urlResolved, {}),
        };
      }
    } finally {
      inProgressGetRemoteH5Files[url] = false;
    }
  }
  return nwbFiles[url];
};

export const getNwbGroup = async (
  url: string,
  path: string,
): Promise<NwbGroup | undefined> => {
  globalStats.numGroups += 1;
  globalStatsUpdated();

  // Try cache first
  const cached = await getCachedObject(url, path, "group");
  if (cached) return cached as NwbGroup;

  const f = (await getRemoteH5FileForUrl(url)).remoteH5File;
  const itemName = `getNwbGroup-${url}-${path}`;
  setStatusItem(itemName, {
    type: "text",
    text: "g",
    tooltip: `Loading NWB group: ${path}`,
  });
  let group;
  try {
    group = await f.getGroup(path);
  } finally {
    removeStatusItem(itemName);
  }

  // Cache the result if we got one
  if (group) {
    await setCachedObject(url, path, "group", group);
  }

  return group;
};

export const getNwbDataset = async (
  url: string,
  path: string,
): Promise<NwbDataset | undefined> => {
  globalStats.numDatasets += 1;
  globalStatsUpdated();

  // Try cache first
  const cached = await getCachedObject(url, path, "dataset");
  if (cached) return cached as NwbDataset;

  const f = (await getRemoteH5FileForUrl(url)).remoteH5File;
  let dataset;
  const itemName = `getNwbDataset-${url}-${path}`;
  setStatusItem(itemName, {
    type: "text",
    text: "d",
    tooltip: `Loading NWB dataset: ${path}`,
  });
  try {
    dataset = await f.getDataset(path);
  } finally {
    removeStatusItem(itemName);
  }

  // Cache the result if we got one
  if (dataset) {
    await setCachedObject(url, path, "dataset", dataset);
  }

  return dataset;
};

export const getNwbDatasetData = async (
  url: string,
  path: string,
  o: {
    slice?: [number, number][];
    allowBigInt?: boolean;
    canceler?: Canceler;
  },
): Promise<DatasetDataType | undefined> => {
  globalStats.numDatasetDatas += 1;
  globalStatsUpdated();

  const f = (await getRemoteH5FileForUrl(url)).remoteH5File;
  const itemName = `getNwbDatasetData-${url}-${path}-${JSON.stringify(o.slice)}`;
  setStatusItem(itemName, {
    type: "text",
    text: "◯",
    tooltip: `Loading NWB dataset data: ${path}`,
  });
  try {
    const ds = await f.getDataset(path);
    if (!ds) {
      throw new Error(`Dataset not found: ${path}`);
    }
    let totalSize = 1;
    for (let i = 0; i < ds.shape.length; i++) {
      if (o.slice && o.slice[i]) {
        totalSize *= o.slice[i][1] - o.slice[i][0];
      } else {
        totalSize *= ds.shape[i];
      }
    }
    const maxNumElements = 1e7;
    if (totalSize > maxNumElements) {
      throw new Error(
        `Cannot load dataset data for ${path} because it is too large. ${totalSize} > ${maxNumElements}`,
      );
    }
    return await f.getDatasetData(path, o);
  } finally {
    removeStatusItem(itemName);
  }
};

export const useNwbGroup = (url: string, path: string) => {
  const [group, setGroup] = useState<NwbGroup | undefined>(undefined);
  useEffect(() => {
    const load = async () => {
      const g = await getNwbGroup(url, path);
      setGroup(g);
    };
    load();
  }, [url, path]);
  return group;
};

export const useNwbDataset = (url: string, path: string) => {
  const [dataset, setDataset] = useState<NwbDataset | undefined>(undefined);
  useEffect(() => {
    const load = async () => {
      const d = await getNwbDataset(url, path);
      setDataset(d);
    };
    load();
  }, [url, path]);
  return dataset;
};

export const useNwbDatasetData = (url: string, path: string) => {
  const [data, setData] = useState<any | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    const load = async () => {
      setData(undefined);
      let d;
      try {
        d = await getNwbDatasetData(url, path, {});
      } catch (err: any) {
        console.error(`Error loading dataset data: ${err.message}`);
        setErrorMessage(err.message);
        return;
      }
      setData(d);
    };
    load();
  }, [url, path]);
  return { data, errorMessage };
};

const getResolvedUrl = async (url: string): Promise<{ url: string }> => {
  if (isDandiAssetUrl(url)) {
    if (currentDandisetId && tryUsingLindi) {
      const lindiUrl = await tryGetLindiUrl(url, currentDandisetId);
      if (lindiUrl) {
        return { url: lindiUrl };
      }
    }
    const authorizationHeader = getAuthorizationHeaderForUrl(url);
    const headers = authorizationHeader
      ? { Authorization: authorizationHeader }
      : undefined;
    const redirectUrl = (await getRedirectUrl(url, headers)) || url;
    return { url: redirectUrl };
  }
  return { url };
};

const isDandiAssetUrl = (url: string) => {
  if (url.startsWith("https://api-staging.dandiarchive.org/")) {
    return true;
  }
  if (url.startsWith("https://api.dandiarchive.org/")) {
    return true;
  }
  return false;
};

const headRequest = async (url: string, headers?: any) => {
  // // Cannot use HEAD, because it is not allowed by CORS on DANDI AWS bucket

  // let headResponse;
  // try {
  //   headResponse = await fetch(url, { method: "HEAD", headers });
  //   return headResponse;
  // } catch (err: any) {
  //   console.warn(`Unable to HEAD ${url}: ${err.message}`);
  //   throw err;
  // }

  // Instead, use aborted GET.
  const controller = new AbortController();
  const signal = controller.signal;
  const response = await fetch(url, {
    signal,
    headers,
  });
  controller.abort();
  return response;
};

const getRedirectUrl = async (url: string, headers: any) => {
  // const response = await fetch(url, {
  //   method: "HEAD",
  //   headers,
  //   redirect: "follow",
  // });
  // const redirectUrl = response.headers.get("Location") || response.url;
  // if (!redirectUrl) {
  //   console.warn(`No redirect for ${url}`);
  //   return null;
  // }
  // return redirectUrl;

  // This is tricky. Normally we would do a HEAD request with a redirect: 'manual' option.
  // and then look at the Location response header.
  // However, we run into mysterious cors problems
  // So instead, we do a HEAD request with no redirect option, and then look at the response.url
  const response = await headRequest(url, headers);
  if (response.url) {
    const redirectUrl = response.url;
    return redirectUrl;
  }

  // if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
  //     return response.headers.get('Location')
  // }

  // return null; // No redirect
};

export const tryGetLindiUrl = async (url: string, dandisetId: string) => {
  // // disable these for now because retrieval of lindi not working from Brown u.
  // if (["000248", "001195"].includes(dandisetId)) {
  //   return undefined;
  // }

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
