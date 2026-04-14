import { getHdf5DatasetData } from "@hdf5Interface";
import { FunctionComponent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import getAuthorizationHeaderForUrl from "../../../util/getAuthorizationHeaderForUrl";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

/** Searches a dandiset for an asset by its path and returns the asset ID. */
const findDandiAssetIdByPath = async (
  apiBaseUrl: string,
  dandisetId: string,
  dandisetVersion: string,
  assetPath: string,
  headers?: { Authorization: string },
): Promise<string> => {
  const searchUrl =
    `${apiBaseUrl}/api/dandisets/${dandisetId}/versions/${dandisetVersion}` +
    `/assets/?path=${encodeURIComponent(assetPath)}`;
  const response = await fetch(searchUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to search for asset at ${assetPath} on DANDI.`);
  }
  const data = await response.json();
  const assetId = data.results?.[0]?.asset_id;
  if (!assetId) {
    throw new Error(
      `This video cannot be played because the video file was not found in ` +
        `dandiset ${dandisetId} (version: ${dandisetVersion}) at the expected ` +
        `path "${assetPath}". The file may not have been uploaded, or it may ` +
        `have been uploaded with a different name.`,
    );
  }
  return assetId;
};

/** Unwraps HDF5 format variations (string, array, Uint8Array) into a plain string. */
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

/**
 * Resolves the playable video URL from an NWB ImageSeries external_file.
 *
 * If the external_file value is an absolute URL, it is returned directly.
 * If it is a relative path (e.g. "../video.avi"), the function resolves it
 * through the DANDI API: looks up the NWB asset's path within the dandiset,
 * combines it with the relative video path, searches for the video asset,
 * and follows the download redirect to get the final S3 URL.
 */
const resolveExternalVideoUrl = async (
  nwbUrl: string,
  seriesPath: string,
  dandisetId: string | null,
  dandisetVersion: string,
): Promise<string> => {
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

  const isDandiLikeUrl = /\/api\/assets\/[^/]+\//.test(nwbUrl);
  if (!isDandiLikeUrl) {
    const origin = new URL(nwbUrl).origin;
    throw new Error(
      `This video cannot be played because the NWB file is hosted on ${origin} ` +
        `and we do not have a path resolver for this archive. Currently only ` +
        `DANDI-compatible archives are supported for resolving relative external_file paths.`,
    );
  }

  if (!dandisetId) {
    throw new Error(
      `This video cannot be played because the dandisetId is missing from the URL. ` +
        `To resolve relative video paths, the page URL must include a dandisetId ` +
        `parameter (e.g. &dandisetId=000409).`,
    );
  }

  const assetId = nwbUrl.match(/\/assets\/([^/]+)\//)?.[1];
  if (!assetId) {
    throw new Error(
      "Unable to determine the NWB asset ID from the current URL.",
    );
  }

  const apiBaseUrl = new URL(nwbUrl).origin;
  const metadataUrl = `${apiBaseUrl}/api/assets/${assetId}/`;
  const authHeader = getAuthorizationHeaderForUrl(metadataUrl);
  const headers = authHeader ? { Authorization: authHeader } : undefined;

  const assetMetadataResponse = await fetch(metadataUrl, { headers });
  if (!assetMetadataResponse.ok) {
    throw new Error("Failed to load NWB asset metadata from DANDI.");
  }
  const assetMetadata = await assetMetadataResponse.json();
  const assetPath: string = assetMetadata.path;
  if (!assetPath) {
    throw new Error("DANDI asset metadata did not include a path.");
  }

  const assetDir = assetPath.split("/").slice(0, -1).join("/");
  const cleanRelativePath = externalFile
    .replace(/\\/g, "/")
    .replace(/^[./]+/, "");
  const fullVideoAssetPath = assetDir
    ? `${assetDir}/${cleanRelativePath}`
    : cleanRelativePath;

  const videoAssetId = await findDandiAssetIdByPath(
    apiBaseUrl,
    dandisetId,
    dandisetVersion,
    fullVideoAssetPath,
    headers,
  );

  const downloadUrl = `${apiBaseUrl}/api/assets/${videoAssetId}/download/`;
  const redirectAuthHeader = getAuthorizationHeaderForUrl(downloadUrl);
  const redirectHeaders = redirectAuthHeader
    ? { Authorization: redirectAuthHeader }
    : undefined;
  const controller = new AbortController();
  const response = await fetch(downloadUrl, {
    signal: controller.signal,
    headers: redirectHeaders,
  });
  controller.abort();
  return response.url || downloadUrl;
};

const ExternalFileVideoView: FunctionComponent<Props> = ({
  height = 600,
  nwbUrl,
  path,
}) => {
  const [searchParams] = useSearchParams();

  const [videoUrl, setVideoUrl] = useState<string>();
  const [urlResolutionError, setUrlResolutionError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [codecError, setCodecError] = useState(false);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      setUrlResolutionError(undefined);
      setVideoUrl(undefined);
      try {
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
          setUrlResolutionError(
            err instanceof Error ? err.message : String(err),
          );
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

  const errorMessage = urlResolutionError
    ? urlResolutionError
    : codecError
      ? "This video could not be played because its container or codec is not " +
        "supported by the browser. Most likely, the uploaded video uses a format " +
        "like AVI with a non-browser-friendly codec."
      : null;

  if (errorMessage) {
    return (
      <div
        style={{
          padding: "18px 20px",
          margin: "20px",
          border: "1px solid #e0c080",
          borderRadius: 8,
          background: "#fffbf0",
          color: "#6b5a2e",
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Video Unavailable
        </div>
        {errorMessage}
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
          onError={() => setCodecError(true)}
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
