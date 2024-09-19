/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MergedRemoteH5File,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
  RemoteH5Group,
  getMergedRemoteH5File,
  getRemoteH5File,
  getRemoteH5FileLindi,
  globalRemoteH5FileStats,
} from "@remote-h5-file/index";
import { track } from "@vercel/analytics/react";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useCustomStatusBarElements } from "../../StatusBar";
import useRoute, { StorageType } from "../../useRoute";
import {
  DandiAssetContext,
  DandiAssetContextType,
  defaultDandiAssetContext,
} from "./DandiAssetContext";
import { SetupContextAnnotationsProvider } from "./NeurosiftAnnotations/useContextAnnotations";
import { NwbFileContext } from "./NwbFileContext";
import { SetupNwbOpenTabs } from "./NwbOpenTabsContext";
import NwbTabWidget from "./NwbTabWidget";
import {
  SelectedItemViewsContext,
  selectedItemViewsReducer,
} from "./SelectedItemViewsContext";
import { SetupNwbFileSpecificationsProvider } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import getAuthorizationHeaderForUrl from "./getAuthorizationHeaderForUrl";
import { string } from "mathjs";

type Props = {
  width: number;
  height: number;
};

// const url = 'https://api.dandiarchive.org/api/assets/29ba1aaf-9091-469a-b331-6b8ab818b5a6/download/'

const NwbPage: FunctionComponent<Props> = ({ width, height }) => {
  const { route } = useRoute();

  // useEffect(() => {
  //     let canceled = false
  //     ; (async () => {
  //         if ((route.page === 'nwb') && (!route.url) && (route.dandiAssetUrl)) {
  //             const info = await fetchJson(route.dandiAssetUrl)
  //             if (canceled) return
  //             const blobUrl = info['contentUrl'].find((x: any) => (x.startsWith('https://dandiarchive.s3.amazonaws.com/blobs')))
  //             setRoute({
  //                 ...route,
  //                 url: blobUrl
  //             })
  //         }
  //     })()
  //     return () => {canceled = true}
  // }, [route.page, route, setRoute])

  if (route.page === "nwb" && !route.url) {
    // if (route.dandiAssetUrl) {
    //     return <div style={{paddingLeft: 20}}>Obtaining asset blob URL from {route.dandiAssetUrl}</div>
    // }
    return <div style={{ paddingLeft: 20 }}>No url query parameter</div>;
  }
  return <NwbPageChild1 width={width} height={height} />;
};

type NwbPageChild1Props = {
  width: number;
  height: number;
};

const NwbPageChild1: FunctionComponent<NwbPageChild1Props> = ({
  width,
  height,
}) => {
  const { route } = useRoute();
  if (route.page !== "nwb") throw Error("Unexpected: route.page is not nwb");

  useEffect(() => {
    let canceled = false;
    // important to only call this once per route change
    setTimeout(() => {
      if (canceled) return;
      // important to wait until the analytics is ready
      track("nwb-page-viewed", {
        url: route.url[0] || "",
        dandisetId: route.dandisetId || "",
        dandisetVersion: route.dandisetVersion || "",
      });
    }, 500);
    return () => {
      canceled = true;
    };
  }, [route.url, route.dandisetId, route.dandisetVersion]);

  const [dandiAssetContextValue, setDandiAssetContextValue] =
    useState<DandiAssetContextType>(defaultDandiAssetContext);
  useEffect(() => {
    let canceled = false;
    (async () => {
      const assetUrl = route.url[0];
      const dandisetId = route.dandisetId;
      const dandisetVersion = route.dandisetVersion;
      let assetId = route.dandiAssetId;
      if (!assetUrl) return;
      if (!dandisetId) return;
      if (!dandisetVersion) return;
      // todo: get the asset ID and the asset path
      // https://api.dandiarchive.org/api/assets/26e85f09-39b7-480f-b337-278a8f034007/download/
      if (isDandiAssetUrl(assetUrl) && !assetId) {
        const aa = assetUrl.split("/");
        assetId = aa[5];
      }
      setDandiAssetContextValue({
        assetUrl,
        dandisetId,
        dandisetVersion,
        assetId,
      });
      const staging = assetUrl.startsWith(
        "https://api-staging.dandiarchive.org/",
      );
      const assetPath = assetId
        ? await getAssetPathForAssetId(
            dandisetId,
            dandisetVersion,
            assetId,
            staging,
          )
        : undefined;
      if (canceled) return;
      setDandiAssetContextValue({
        assetUrl,
        dandisetId,
        dandisetVersion,
        assetId,
        assetPath,
      });
      setDandiAssetContextValue({
        assetUrl,
        dandisetId,
        dandisetVersion,
        assetId,
        assetPath,
      });
    })();
    return () => {
      canceled = true;
    };
  }, [route.url, route.dandisetId, route.dandisetVersion, route.dandiAssetId]);

  return (
    <DandiAssetContext.Provider value={dandiAssetContextValue}>
      <NwbPageChild2 width={width} height={height} />
    </DandiAssetContext.Provider>
  );
};

type NwbPageChild2Props = {
  width: number;
  height: number;
};

const NwbPageChild2: FunctionComponent<NwbPageChild2Props> = ({
  width,
  height,
}) => {
  return <NwbPageChild3 width={width} height={height} />;
};

type NwbPageChild3Props = {
  width: number;
  height: number;
};

const NwbPageChild3: FunctionComponent<NwbPageChild3Props> = ({
  width,
  height,
}) => {
  const { route } = useRoute();
  if (route.page !== "nwb") throw Error("Unexpected: route.page is not nwb");
  const urlList = route.url;
  const [nwbFile, setNwbFile] = useState<RemoteH5FileX | undefined>(undefined);
  const [selectedItemViewsState, selectedItemViewsDispatch] = useReducer(
    selectedItemViewsReducer,
    { selectedItemViews: [] },
  );
  const [loadedSuccessfully, setLoadedSuccessfully] = useState<
    boolean | undefined
  >(undefined);
  const [initialLoadError, setInitialLoadError] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!nwbFile) return;
    nwbFile
      .getGroup("/")
      .then((grp) => {
        if (grp) {
          setLoadedSuccessfully(true);
        } else {
          setLoadedSuccessfully(false);
          const CORSIssueLikely = determineCORSIssueLikely(urlList[0] || "");
          setInitialLoadError(
            "Problem loading file. Unable to load root group." +
              (CORSIssueLikely
                ? " This could be due to a CORS configuration issue."
                : ""),
          );
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadedSuccessfully(false);
        setInitialLoadError("Problem loading file. " + err.message);
      });
  }, [nwbFile, urlList]);

  // status bar text
  const { setCustomStatusBarElement } = useCustomStatusBarElements();
  useEffect(() => {
    let lastStatsString = "";
    const timer = setInterval(() => {
      if (!nwbFile) return;
      const x = globalRemoteH5FileStats;

      // important to do this check so the context state is not constantly changing
      if (JSONStringifyDeterministic(x) === lastStatsString) return;
      lastStatsString = JSONStringifyDeterministic(x);

      const s = (
        <span style={{ cursor: "pointer" }}>
          {x.numPendingRequests > 0 && (
            <span style={{ color: "darkblue" }}>Loading...</span>
          )}
          &nbsp;
          <span title="Number of groups fetched">{x.getGroupCount}</span>
          &nbsp;|&nbsp;
          <span title="Number of datasets fetched">{x.getDatasetCount}</span>
          &nbsp;|&nbsp;
          <span title="Number of datasets data fetched">
            {x.getDatasetDataCount}
          </span>
          &nbsp;|&nbsp;
          <span title="Number of pending requests">{x.numPendingRequests}</span>
          {/* &nbsp;|&nbsp; WIP
          <span title="Amount of data fetched">{formatByteCount(computeTotalBytesFetched(x))}</span> */}
        </span>
      );
      setCustomStatusBarElement && setCustomStatusBarElement("custom1", s);
    }, 250);
    return () => {
      clearInterval(timer);
    };
  }, [nwbFile, setCustomStatusBarElement]);

  const [usingLindi, setUsingLindi] = useState<boolean>(false);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const dandisetId = route.dandisetId;
      const { urls: urlListResolved, storageTypes: storageTypeResolved } =
        await getResolvedUrls(urlList, route.storageType, { dandisetId });
      if (canceled) return;
      let f: MergedRemoteH5File | RemoteH5File | RemoteH5FileLindi;
      setUsingLindi(storageTypeResolved.includes("lindi"));
      if (urlListResolved.length === 1) {
        if (storageTypeResolved[0] === "lindi") {
          f = await getRemoteH5FileLindi(urlListResolved[0]);
        } else {
          f = await getRemoteH5File(urlListResolved[0]);
        }
      } else {
        f = await getMergedRemoteH5File(urlListResolved, storageTypeResolved);
      }
      f.sourceUrls = urlList;
      if (canceled) return;
      setNwbFile(f);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [urlList, route.storageType, route.dandisetId]);

  const [neurodataItems, setNeurodataItems] = useState<
    {
      path: string;
      neurodataType: string;
    }[]
  >([]);

  useEffect(() => {
    let canceled = false;
    setNeurodataItems([]);
    if (!nwbFile) return;
    (async () => {
      let allItems: {
        path: string;
        neurodataType: string;
      }[] = [];
      let timer = Date.now();
      const processGroup = async (group: RemoteH5Group) => {
        if (group.attrs.neurodata_type) {
          allItems = [
            ...allItems,
            { path: group.path, neurodataType: group.attrs.neurodata_type },
          ];
          const elapsed = Date.now() - timer;
          if (elapsed > 300) {
            timer = Date.now();
            setNeurodataItems(allItems);
          }
        }
        for (const subgroup of group.subgroups) {
          const sg = await nwbFile.getGroup(subgroup.path);
          if (sg) {
            await processGroup(sg);
          }
        }
      };
      const rootGroup = await nwbFile.getGroup("/");
      if (!rootGroup) return;
      await processGroup(rootGroup);
      setNeurodataItems(allItems);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);

  const nwbFileContextValue = useMemo(() => {
    if (!nwbFile) return undefined;
    return {
      nwbFile,
      neurodataItems,
    };
  }, [nwbFile, neurodataItems]);

  if (!nwbFile || !nwbFileContextValue) return <div>Loading {urlList}</div>;

  if (loadedSuccessfully === false) {
    return <div>Error loading file: {initialLoadError}</div>;
  }

  return (
    <NwbFileContext.Provider value={nwbFileContextValue}>
      <SelectedItemViewsContext.Provider
        value={{ selectedItemViewsState, selectedItemViewsDispatch }}
      >
        <SetupNwbOpenTabs>
          <SetupNwbFileSpecificationsProvider>
            <SetupContextAnnotationsProvider>
              <NwbTabWidget
                width={width}
                height={height}
                usingLindi={usingLindi}
              />
            </SetupContextAnnotationsProvider>
          </SetupNwbFileSpecificationsProvider>
        </SetupNwbOpenTabs>
      </SelectedItemViewsContext.Provider>
    </NwbFileContext.Provider>
  );
};

const computeTotalBytesFetched = () => {
  // how to calculate this?
  return 0;
};

export const headRequest = async (url: string, headers?: any) => {
  // // Cannot use HEAD, because it is not allowed by CORS on DANDI AWS bucket
  let headResponse;
  try {
    headResponse = await fetch(url, { method: "HEAD", headers });
    return headResponse;
  } catch (err: any) {
    console.warn(`Unable to HEAD ${url}: ${err.message}`);
    throw err;
  }

  // // Instead, use aborted GET.
  // const controller = new AbortController();
  // const signal = controller.signal;
  // const response = await fetch(url, {
  //   signal,
  //   headers,
  // });
  // controller.abort();
  // return response;
};

const etagCache: { [key: string]: string | undefined } = {};

export const getEtag = async (url: string) => {
  if (etagCache[url]) return etagCache[url];
  const headResponse = await headRequest(url);
  if (!headResponse) return undefined;
  const etag = headResponse.headers.get("ETag");
  if (!etag) {
    return undefined;
  }
  // remove quotes
  const ret = etag.slice(1, etag.length - 1);
  etagCache[url] = ret;
  return ret;
};

const getResolvedUrl = async (
  url: string,
  storageType: StorageType,
  o: { dandisetId?: string },
): Promise<{ url: string; storageType: StorageType }> => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const queryParams = Object.fromEntries(urlSearchParams.entries());
  if (storageType === "zarr") return { url, storageType };
  if (storageType === "lindi") return { url, storageType };
  if (isDandiAssetUrl(url)) {
    const authorizationHeader = getAuthorizationHeaderForUrl(url);
    const headers = authorizationHeader
      ? { Authorization: authorizationHeader }
      : undefined;
    const redirectUrl = (await getRedirectUrl(url, headers)) || url;
    const lindiUrl =
      o.dandisetId && !(queryParams.lindi === "0")
        ? await tryGetLindiUrl(url, o.dandisetId)
        : undefined;
    if (lindiUrl) {
      console.info(`Using lindi ${url} -> ${lindiUrl}`);
      return { url: lindiUrl, storageType: "lindi" };
    }
    return { url: redirectUrl, storageType };
  }
  return { url, storageType };
};

export const tryGetLindiUrl = async (url: string, dandisetId: string) => {
  let assetId: string;
  let staging: boolean;
  if (url.startsWith("https://api-staging.dandiarchive.org/api/assets/")) {
    staging = true;
    assetId = url.split("/")[5];
  } else if (url.startsWith("https://api.dandiarchive.org/api/assets/")) {
    staging = false;
    assetId = url.split("/")[5];
  } else {
    return undefined;
  }
  const aa = staging ? "dandi-staging" : "dandi";
  const tryUrl = `https://lindi.neurosift.org/${aa}/dandisets/${dandisetId}/assets/${assetId}/nwb.lindi.json`;
  const resp = await fetch(tryUrl, { method: "HEAD" });
  if (resp.ok) return tryUrl;
  return undefined;
};

const getResolvedUrls = async (
  urlList: string[],
  storageType: StorageType[],
  o: { dandisetId?: string },
) => {
  const a = await Promise.all(
    urlList.map((url, i) => getResolvedUrl(url, storageType[i], o)),
  );
  return {
    urls: a.map((x) => x.url),
    storageTypes: a.map((x) => x.storageType),
  };
};

const getRedirectUrl = async (url: string, headers: any) => {
  const response = await fetch(url, {
    method: "HEAD",
    headers,
    redirect: "follow",
  });
  const redirectUrl = response.headers.get("Location") || response.url;
  if (!redirectUrl) {
    console.warn(`No redirect for ${url}`);
    return null;
  }
  return redirectUrl;

  // // This is tricky. Normally we would do a HEAD request with a redirect: 'manual' option.
  // // and then look at the Location response header.
  // // However, we run into mysterious cors problems
  // // So instead, we do a HEAD request with no redirect option, and then look at the response.url
  // const response = await headRequest(url, headers);
  // if (response.url) {
  //   const redirectUrl = response.url;
  //   return redirectUrl;
  // }

  // // if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
  // //     return response.headers.get('Location')
  // // }

  // return null; // No redirect
};

const isDandiAssetUrl = (url: string) => {
  if (url.startsWith("https://api-staging.dandiarchive.org/")) {
    return true;
  }
  if (url.startsWith("https://api.dandiarchive.org/")) {
    return true;
  }
};

const getAssetPathForAssetId = async (
  dandisetId: string,
  dandisetVersion: string,
  assetId: string | undefined,
  staging: boolean,
) => {
  if (!assetId) return undefined;
  const baseUrl = staging
    ? "https://api-staging.dandiarchive.org"
    : "https://api.dandiarchive.org";
  const url = `${baseUrl}/api/dandisets/${dandisetId}/versions/${dandisetVersion}/assets/${assetId}/`;
  const authorizationHeader = getAuthorizationHeaderForUrl(url);
  const headers = authorizationHeader
    ? { Authorization: authorizationHeader }
    : undefined;
  const resp = await fetch(url, { headers });
  if (!resp.ok) return undefined;
  const obj = await resp.json();
  return obj["path"];
};

// Thanks: https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JSONStringifyDeterministic = (
  obj: any,
  space: string | number | undefined = undefined,
) => {
  const allKeys: string[] = [];
  JSON.stringify(obj, function (key, value) {
    allKeys.push(key);
    return value;
  });
  allKeys.sort();
  return JSON.stringify(obj, allKeys, space);
};

const determineCORSIssueLikely = (url: string) => {
  if (!url) return false;
  if (url.startsWith("http://localhost")) return false;
  if (url.startsWith("https://api.dandiarchive.org")) return false;
  return true;
};

export default NwbPage;
