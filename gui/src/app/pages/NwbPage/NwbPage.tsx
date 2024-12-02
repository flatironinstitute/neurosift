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
} from "neurosift-lib/remote-h5-file/index";
import { track } from "@vercel/analytics/react";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useCustomStatusBarElements } from "../../StatusBar";
import useRoute, { StorageType } from "neurosift-lib/contexts/useRoute";
import {
  DandiAssetContext,
  DandiAssetContextType,
  defaultDandiAssetContext,
} from "./DandiAssetContext";
import { SetupContextAnnotationsProvider } from "./NeurosiftAnnotations/useContextAnnotations";
import { NwbFileContext } from "neurosift-lib/misc/NwbFileContext";
import { SetupNwbOpenTabs } from "./NwbOpenTabsContext";
import NwbTabWidget from "./NwbTabWidget";
import {
  SelectedItemViewsContext,
  selectedItemViewsReducer,
} from "./SelectedItemViewsContext";
import { SetupNwbFileSpecificationsProvider } from "neurosift-lib/misc/SpecificationsView/SetupNwbFileSpecificationsProvider";
import getAuthorizationHeaderForUrl from "./getAuthorizationHeaderForUrl";
import getNwbFileInfoForChat, {
  NwbFileInfoForChat,
} from "./getNwbFileInfoForChat";
import { globalChatCompletionUsage } from "neurosift-lib/pages/ChatPage/chatCompletion";

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

  if (route.page !== "nwb")
    throw Error("Unexpected route for NwbPage: " + route.page);

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
            "Problem loading file. Unable to load root group. If this dandiset is embargoed, make sure to set your DANDI_API_KEY under the key icon in the top right corner." +
              (CORSIssueLikely
                ? " This could also be due to a CORS configuration issue."
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
      const statsString = JSONStringifyDeterministic(x);
      if (statsString === lastStatsString) return;
      lastStatsString = statsString;

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

const useNwbFileInfoForChat = (
  nwbFile?: RemoteH5FileX,
): NwbFileInfoForChat | undefined => {
  const [nwbFileInfo, setNwbFileInfo] = useState<
    NwbFileInfoForChat | undefined
  >(undefined);

  useEffect(() => {
    let canceled = false;
    if (!nwbFile) {
      setNwbFileInfo(undefined);
      return;
    }
    (async () => {
      try {
        const x = await getNwbFileInfoForChat(nwbFile);
        if (canceled) return;
        setNwbFileInfo(x);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);

  return nwbFileInfo;
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
  if (url.startsWith("kachery:")) {
    const storageType2 = getStorageTypeForUri(url) || storageType;
    const aa = await getUrlForKacheryUri(url);
    if (!aa) {
      throw Error(`Unable to resolve kachery uri: ${url}`);
    }
    const { url: url2 } = aa;
    return { url: url2, storageType: storageType2 };
  }
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

const getStorageTypeForUri = (uri: string): StorageType | undefined => {
  if (uri.endsWith(".nwb")) {
    return "h5";
  } else if (uri.endsWith(".lindi.json")) {
    return "lindi";
  } else if (uri.endsWith(".lindi.tar")) {
    return "lindi";
  } else {
    return undefined;
  }
};

const urlForKacheryUriCache: {
  [key: string]:
    | { url: string; size: number; foundLocally: boolean; expires: number }
    | undefined;
} = {};

const getUrlForKacheryUri = async (uri: string) => {
  if (urlForKacheryUriCache[uri]) {
    const x = urlForKacheryUriCache[uri];
    if (x && Date.now() < x.expires) {
      return x;
    } else {
      delete urlForKacheryUriCache[uri];
    }
  }
  const parts = uri.split(":");
  if (parts.length < 4) {
    console.warn(`Invalid kachery URI: ${uri}`);
    return undefined;
  }
  if (parts[0] !== "kachery") {
    console.warn(`Invalid kachery URI: ${uri}`);
    return undefined;
  }
  const zone = parts[1];
  const alg = parts[2];
  const hash = parts[3];
  // const label = parts[4];
  const aa = await getFileDownloadUrlNewKachery(alg, hash, zone);
  if (!aa) return undefined;
  const { url, size, foundLocally } = aa;
  const expires = Date.now() + 1000 * 60 * 10; // 10 minutes
  urlForKacheryUriCache[uri] = { url, size, foundLocally, expires };
  return { url, size, foundLocally, sha1: hash };
};

const getFileDownloadUrlNewKachery = async (
  hashAlg: string,
  hash: string,
  zoneName: string,
): Promise<
  { url: string; size: number; foundLocally: boolean } | undefined
> => {
  const url = `https://kachery.vercel.app/api/findFile`;
  const payload = {
    type: "findFileRequest",
    hashAlg,
    hash,
    zoneName,
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    console.warn(
      `Error in findFile request: ${response.status} ${response.statusText}`,
    );
    return undefined;
  }
  const resp = await response.json();
  return {
    url: resp.url,
    size: resp.size,
    foundLocally: false,
  };
};

export const tryGetLindiUrl = async (url: string, dandisetId: string) => {
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

export const nwbFileInfoForChatToText = (nwbFileInfo: NwbFileInfoForChat) => {
  const nwbSummaryLines: string[] = [];
  for (const x of nwbFileInfo.metaFields) {
    nwbSummaryLines.push(`${x.name}: ${x.value}`);
  }
  for (const x of nwbFileInfo.neurodataGroups) {
    nwbSummaryLines.push(
      `Group ${x.path} (${x.neurodataType}): ${x.description}`,
    );
  }
  for (const x of nwbFileInfo.neurodataDatasets) {
    nwbSummaryLines.push(
      `Dataset ${x.path} (${x.neurodataType}): ${x.description} | shape = ${x.shape.join(" x ")} | dtype = ${x.dtype}`,
    );
  }

  const ret = `
Here's a summary of the contents of the NWB file:

${nwbSummaryLines.join("\n")}\n
`;
  return ret;
};

const resourceDocs = [
  {
    name: "loading_nwb_objects_using_pynapple",
    description: "Loading NWB objects using Pynapple",
    content: `
To load an NWB Units object into Pynapple, do the following:
\`\`\`python
import pynapple as nap
# ... get the pynwb file object 'nwbfile' ...
nwbp = nap.NWBFile(nwbfile)
units = nwbp["units"]  # TsGroup
print(units)
\`\`\`
However this is not be a good idea if there are a very large number of spikes.

To load an NWB timeseries object into Pynapple, do the following:
Suppose the object is at path "/processing/name_of_timeseries"
and suppose we have already loaded the NWB file into a variable called 'nwbfile'.
\`\`\`python
import pynapple as nap
nwbp = nap.NWBFile(nwbfile)
ts = nwbp["name_of_timeseries"]
\`\`\`
Note that this is referenced by "name_of_timeseries" and not the full path.
This will be a Ts object if the timeseries is 1D, a TsdFrame object if it is 2D, and a TsdTensor object if it is 3D or more.

Similarly, NWB AnnotationsSeries objects can be loaded as Pynapple Ts objects, and NWB TimeIntervals objects can be loaded as Pynapple IntervalSet objects.
`,
  },
  {
    name: "using_pynapple_to_create_2d_tuning_curves",
    description: "Using Pynapple to create 2D tuning curves",
    content: `
Here's an example of how to create 2D tuning curves using Pynapple:
\`\`\`python
import pynapple as nap
# ... get the pynwb file object 'nwbfile' ...
nwbp = nap.NWBFile(nwbfile)
units = nwbp["units"]
position = nwbp["position"]
tc, binsxy = nap.compute_2d_tuning_curves(units, position, 20)

import matplotlib.pyplot as plt
plt.figure(figsize=(15, 7))
for i in tc.keys():
    plt.subplot(2, 4, i + 1)
    plt.imshow(tc[i], origin="lower", aspect="auto")
    plt.title("Unit {}".format(i))
plt.tight_layout()
plt.show()
\`\`\``,
  },
];

// Having trouble with getting chatbot to understand pynapple. This was my attempt but it didn't really work.
// ~~~
// Here's some information about loading neurodata objects into Pynapple.
// Let's use Pynapple whenever it makes sense to do so.

// \`\`\`python
// import pynapple as nap

// # suppose we have loaded the NWB file via pynwb into a variable called 'nwbfile'
// nwbp = nap.NWBFile(nwbfile)

// # Load Units objects as TsGroup
// # Note that it's under the "units" key no matter where the object is in the NWB file
// units = nwbp["units"]

// # TimeIntervals can be loaded as pynapple's IntervalSet
// # Note that it's under the "name_of_time_intervals" key which is the base name, not including e.g., processing/
// intervals = nwbp["name_of_time_intervals"]

// # Similar for DynamicTable as pynapple's Ts
// dtable = nwbp["name_of_dynamic_table"]

// # Similar for AnnotationSeries as pynapple's Ts
// annotations = nwbp["name_of_annotations"]

// # Similar for Timeseries, but the pynapple type depends on the dimensions:
// # 1D: Ts
// # 2D: TsdFrame
// # 3D or more: TsdTensor
// \`\`\`

// In pynapple, if you've got units as a TsGroup and position as a TsdFrame, you can compute 2D tuning curves like this:
// tc, binsxy = nap.compute_2d_tuning_curves(units, position, 20)
// plt.figure(figsize=(15, 7))
// for i in tc.keys():
//     plt.subplot(2, 4, i + 1)
//     plt.imshow(tc[i], origin="lower", aspect="auto")
//     plt.title("Unit {}".format(i))
// plt.tight_layout()
// plt.show()

// position has position["x"] and position["y"] 1D Ts objects.
// ~~~

export default NwbPage;
