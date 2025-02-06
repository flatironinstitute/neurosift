/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Canceler,
  DatasetDataType,
  RemoteH5File,
  RemoteH5FileX,
} from "../../remote-h5-file";
import { getCachedObject, setCachedObject } from "./nwbCache";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

const nwbFiles: {
  [url: string]: RemoteH5FileX;
} = {};

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

export const getNwbGroup = async (
  url: string,
  path: string,
): Promise<NwbGroup | undefined> => {
  // Try cache first
  const cached = await getCachedObject(url, path, "group");
  if (cached) return cached as NwbGroup;

  // If not in cache, fetch from file
  if (!nwbFiles[url]) {
    const { url: urlResolved } = await getResolvedUrl(url);
    nwbFiles[url] = new RemoteH5File(urlResolved, {});
  }
  const f = nwbFiles[url];
  const group = await f.getGroup(path);

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
  // Try cache first
  const cached = await getCachedObject(url, path, "dataset");
  if (cached) return cached as NwbDataset;

  // If not in cache, fetch from file
  if (!nwbFiles[url]) {
    const { url: urlResolved } = await getResolvedUrl(url);
    nwbFiles[url] = new RemoteH5File(urlResolved, {});
  }
  const f = nwbFiles[url];
  const dataset = await f.getDataset(path);

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
  if (!nwbFiles[url]) {
    const { url: urlResolved } = await getResolvedUrl(url);
    nwbFiles[url] = new RemoteH5File(urlResolved, {});
  }
  const f = nwbFiles[url];
  return await f.getDatasetData(path, o);
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
  useEffect(() => {
    const load = async () => {
      const d = await getNwbDatasetData(url, path, {});
      setData(d);
    };
    load();
  }, [url, path]);
  return data;
};

const getResolvedUrl = async (url: string): Promise<{ url: string }> => {
  if (isDandiAssetUrl(url)) {
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
