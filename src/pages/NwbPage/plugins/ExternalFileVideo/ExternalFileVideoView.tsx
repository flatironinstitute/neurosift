import {
  getHdf5DatasetData,
  getHdf5Group,
  isDandiAssetUrl,
} from "@hdf5Interface";
import { FunctionComponent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

const normalizeExternalFileValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    return normalizeExternalFileValue(value[0]);
  }
  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }
  if (ArrayBuffer.isView(value)) {
    return normalizeExternalFileValue(
      Array.from(value as unknown as ArrayLike<unknown>),
    );
  }
  return undefined;
};

const getDandiApiBaseUrl = (nwbUrl: string) => {
  return new URL(nwbUrl).origin;
};

const getAssetIdFromNwbUrl = (nwbUrl: string) => {
  const match = nwbUrl.match(/\/assets\/([^/]+)\//);
  return match?.[1];
};

const dirnamePosix = (path: string) => {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
};

const joinPosix = (a: string, b: string) => {
  if (!a) return b;
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
};

const resolveExternalVideoUrl = async (
  nwbUrl: string,
  seriesPath: string,
  dandisetId: string | null,
  dandisetVersion: string,
) => {
  const externalFileValue = await getHdf5DatasetData(
    nwbUrl,
    `${seriesPath}/external_file`,
    {
      slice: [[0, 1]],
    },
  );
  const externalFile = normalizeExternalFileValue(externalFileValue)?.trim();
  if (!externalFile) {
    throw new Error("Could not read external_file from the NWB ImageSeries.");
  }

  if (
    externalFile.startsWith("https://") ||
    externalFile.startsWith("http://")
  ) {
    return externalFile;
  }

  if (!isDandiAssetUrl(nwbUrl)) {
    throw new Error(
      "Only absolute URLs and DANDI-hosted relative external_file paths are supported in this first version.",
    );
  }

  if (!dandisetId) {
    throw new Error(
      "A dandisetId is required to resolve a relative external_file path.",
    );
  }

  const assetId = getAssetIdFromNwbUrl(nwbUrl);
  if (!assetId) {
    throw new Error(
      "Unable to determine the NWB asset ID from the current URL.",
    );
  }

  const apiBaseUrl = getDandiApiBaseUrl(nwbUrl);
  const metadataUrl = `${apiBaseUrl}/api/assets/${assetId}/`;
  const authHeader = getAuthorizationHeaderForUrl(metadataUrl);
  const headers = authHeader ? { Authorization: authHeader } : undefined;

  const assetMetadataResponse = await fetch(metadataUrl, { headers });
  if (!assetMetadataResponse.ok) {
    throw new Error("Failed to load NWB asset metadata from DANDI.");
  }
  const assetMetadata = await assetMetadataResponse.json();
  const assetPath = assetMetadata.path;
  if (!assetPath) {
    throw new Error("DANDI asset metadata did not include a path.");
  }

  const cleanRelativePath = externalFile
    .replace(/\\/g, "/")
    .replace(/^[./]+/, "");
  const fullVideoAssetPath = joinPosix(
    dirnamePosix(assetPath),
    cleanRelativePath,
  );
  const searchUrl =
    `${apiBaseUrl}/api/dandisets/${dandisetId}/versions/${dandisetVersion}` +
    `/assets/?path=${encodeURIComponent(fullVideoAssetPath)}`;
  const searchResponse = await fetch(searchUrl, { headers });
  if (!searchResponse.ok) {
    throw new Error("Failed to resolve the external video asset on DANDI.");
  }
  const searchData = await searchResponse.json();
  const videoAssetId = searchData.results?.[0]?.asset_id;
  if (!videoAssetId) {
    throw new Error(
      `Could not find the external video asset at ${fullVideoAssetPath}.`,
    );
  }

  const downloadUrl = `${apiBaseUrl}/api/assets/${videoAssetId}/download/`;
  return resolveRedirect(downloadUrl);
};

const resolveRedirect = async (url: string): Promise<string> => {
  const authHeader = getAuthorizationHeaderForUrl(url);
  const headers = authHeader ? { Authorization: authHeader } : undefined;
  const controller = new AbortController();
  const response = await fetch(url, {
    signal: controller.signal,
    headers,
  });
  controller.abort();
  if (response.url) {
    return response.url;
  }
  return url;
};

const ExternalFileVideoView: FunctionComponent<Props> = ({
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      setError(undefined);
      setVideoUrl(undefined);
      try {
        const group = await getHdf5Group(nwbUrl, path);
        if (!group) {
          throw new Error("Unable to load the ImageSeries group.");
        }
        if (!group.datasets.some((ds) => ds.name === "external_file")) {
          throw new Error("This ImageSeries does not define an external_file.");
        }
        const resolvedVideoUrl = await resolveExternalVideoUrl(
          nwbUrl,
          path,
          searchParams.get("dandisetId"),
          searchParams.get("dandisetVersion") || "draft",
        );
        if (!canceled) {
          setVideoUrl(resolvedVideoUrl);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, searchParams]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Resolving external video...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  }

  if (!videoUrl) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        No playable external video URL was found.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        width: "100%",
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          maxHeight: height - 40,
          backgroundColor: "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          controls
          src={videoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default ExternalFileVideoView;
