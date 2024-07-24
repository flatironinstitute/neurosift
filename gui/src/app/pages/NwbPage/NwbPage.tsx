/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MergedRemoteH5File,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
  getMergedRemoteH5File,
  getRemoteH5File,
  getRemoteH5FileLindi,
  globalRemoteH5FileStats,
} from "@remote-h5-file/index";
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
  AssociatedDendroProject,
  DandiAssetContext,
  DandiAssetContextType,
  defaultDandiAssetContext,
  useDandiAssetContext,
} from "./DandiAssetContext";
import { SetupContextAnnotationsProvider } from "./NeurosiftAnnotations/useContextAnnotations";
import { NwbFileContext } from "./NwbFileContext";
import { SetupNwbOpenTabs } from "./NwbOpenTabsContext";
import NwbTabWidget from "./NwbTabWidget";
import {
  SelectedItemViewsContext,
  selectedItemViewsReducer,
} from "./SelectedItemViewsContext";
import getAuthorizationHeaderForUrl from "./getAuthorizationHeaderForUrl";
import {
  SupplementalDendroFilesContext,
  useSupplementalDendroFiles,
} from "./SupplementalDendroFilesContext";
import { DendroFile } from "../../dendro/dendro-types";
import { SetupNwbFileSpecificationsProvider } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import { track } from "@vercel/analytics/react";

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
      const url = "https://dendro.vercel.app/api/gui/find_projects";
      const data = {
        fileUrl: assetUrl,
      };
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!resp.ok) return;
      const obj = await resp.json();
      if (canceled) return;
      const associatedDendroProjects: AssociatedDendroProject[] =
        obj.projects.map((p: any) => ({
          projectId: p.projectId,
          name: p.name,
          ownerId: p.ownerId,
        }));
      setDandiAssetContextValue({
        assetUrl,
        dandisetId,
        dandisetVersion,
        assetId,
        assetPath,
        associatedDendroProjects,
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
  const [selectedSupplementalFileIds, setSelectedSupplementalFileIds] =
    useState<string[]>([]);

  const { assetUrl, dandisetId, dandisetVersion, assetId } =
    useDandiAssetContext();
  const supplementalDendroFiles = useSupplementalDendroFilesHelper({
    dandisetId,
    dandisetVersion,
    dandiAssetId: assetId,
    thisUrl: assetUrl,
  });

  return (
    <SupplementalDendroFilesContext.Provider
      value={{
        supplementalFiles: supplementalDendroFiles,
        selectedSupplementalFileIds,
        setSelectedSupplementalFileIds,
      }}
    >
      <NwbPageChild3 width={width} height={height} />
    </SupplementalDendroFilesContext.Provider>
  );
};

export const useSupplementalDendroFilesHelper = (a: {
  dandisetId: string;
  dandisetVersion: string;
  dandiAssetId?: string;
  thisUrl: string;
}): DendroFile[] | undefined => {
  const { dandisetId, dandisetVersion, dandiAssetId } = a;
  const [supplementalDendroFiles, setSupplementalDendroFiles] = useState<
    DendroFile[] | undefined
  >(undefined);
  useEffect(() => {
    if (!dandisetId) return;
    if (!dandisetVersion) return;
    if (!dandiAssetId) return;
    let canceled = false;
    (async () => {
      const url = "https://dendro.vercel.app/api/gui/find_files_with_metadata";
      const data = {
        query: {
          dandisetId,
          dandisetVersion,
          dandiAssetId,
          supplemental: true,
        },
      };
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!resp.ok) return;
      const obj = await resp.json();
      if (canceled) return;
      setSupplementalDendroFiles(
        obj.files.filter((x: any) => x.content !== "url:" + a.thisUrl),
      ); // don't include this one
    })();
    return () => {
      canceled = true;
    };
  }, [dandisetId, dandisetVersion, dandiAssetId, a.thisUrl]);
  if (!dandisetId) return undefined;
  if (!dandisetVersion) return undefined;
  if (!dandiAssetId) return undefined;
  return supplementalDendroFiles;
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

  const { supplementalFiles, selectedSupplementalFileIds } =
    useSupplementalDendroFiles();

  const selectedSupplementalUrls = useMemo(() => {
    const ret: string[] = [];
    for (const id of selectedSupplementalFileIds) {
      const file = supplementalFiles?.find((x) => x.fileId === id);
      if (file) {
        if (file.content.startsWith("url:")) {
          ret.push(file.content.substring("url:".length));
        }
      }
    }
    return ret;
  }, [selectedSupplementalFileIds, supplementalFiles]);

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
        <span style={{}}>
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
      const urlListSupplemented = [...urlList, ...selectedSupplementalUrls];
      const storageTypeListSupplemented = [
        ...route.storageType,
        ...selectedSupplementalUrls.map(() => "lindi" as StorageType),
      ]; // for now we assume all supplemental are lindi
      const { urls: urlListResolved, storageTypes: storageTypeResolved } =
        await getResolvedUrls(
          urlListSupplemented,
          storageTypeListSupplemented,
          { dandisetId },
        );
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
      if (canceled) return;
      setNwbFile(f);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [urlList, route.storageType, route.dandisetId, selectedSupplementalUrls]);

  const nwbFileContextValue = useMemo(() => {
    if (!nwbFile) return undefined;
    return {
      nwbFile,
    };
  }, [nwbFile]);

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

export const headRequest = async (url: string, headers?: any) => {
  // Cannot use HEAD, because it is not allowed by CORS on DANDI AWS bucket
  // let headResponse
  // try {
  //     headResponse = await fetch(url, {method: 'HEAD'})
  //     if (headResponse.status !== 200) {
  //         return undefined
  //     }
  // }
  // catch(err: any) {
  //     console.warn(`Unable to HEAD ${url}: ${err.message}`)
  //     return undefined
  // }
  // return headResponse

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
  // This is tricky. Normally we would do a HEAD request with a redirect: 'manual' option.
  // and then look at the Location response header.
  // However, we run into mysterious cors problems
  // So instead, we do a HEAD request with no redirect option, and then look at the response.url
  const response = await headRequest(url, headers);
  if (response.url) return response.url;

  // if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
  //     return response.headers.get('Location')
  // }

  return null; // No redirect
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
