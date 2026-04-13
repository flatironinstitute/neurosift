import { getHdf5DatasetData, isDandiAssetUrl } from "@hdf5Interface";
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
      `This video cannot be played because the video file was not found in the ` +
        `dandiset at the expected path "${assetPath}". The file may not have been ` +
        `uploaded, or it may have been uploaded with a different name.`,
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
  // --- Step 1: Read the external_file value from the NWB file ---
  // The NWB ImageSeries stores a reference to the video file in its external_file dataset.
  // This can be an absolute URL ("https://...") or a relative path ("../video.avi").
  // We read just the first element (slice [0,1]) since we support one video per series,
  // then normalize it because HDF5 can return the value as a string, array, or Uint8Array.
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

  // --- Step 2: If it's an absolute URL, we're done ---
  // Some NWB files store the full URL to the video. No resolution needed.
  if (
    externalFile.startsWith("https://") ||
    externalFile.startsWith("http://")
  ) {
    return externalFile;
  }

  // --- Step 3: Validate that we have everything needed for DANDI resolution ---
  // A relative path like "../video.avi" only makes sense if the NWB file is hosted
  // on a DANDI archive, because we need the DANDI API to find the video asset.
  // We validate three prerequisites before making any network calls.

  // 3a: The NWB file must be on a known DANDI archive
  if (!isDandiAssetUrl(nwbUrl)) {
    const origin = new URL(nwbUrl).origin;
    throw new Error(
      `This video cannot be played because the NWB file is hosted on ${origin}, ` +
        `which is not a supported archive. Video playback for relative external_file ` +
        `paths is currently only available for files hosted on DANDI.`,
    );
  }

  // 3b: We need the dandisetId (from URL query params) to search within the right dandiset
  if (!dandisetId) {
    throw new Error(
      "A dandisetId is required to resolve a relative external_file path.",
    );
  }

  // 3c: We need the NWB file's own asset ID to look up its location in the dandiset
  const assetId = nwbUrl.match(/\/assets\/([^/]+)\//)?.[1];
  if (!assetId) {
    throw new Error(
      "Unable to determine the NWB asset ID from the current URL.",
    );
  }

  // --- Step 4: Find where the NWB file lives in the dandiset ---
  // We know the NWB file's asset ID but not its path within the dandiset
  // (e.g. "sub-mouse1/sub-mouse1_ecephys.nwb"). We need this path because
  // the relative video path is relative to the NWB file's location.
  // We ask the DANDI API for the asset's metadata, which includes its path.
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

  // --- Step 5: Build the video's full path in the dandiset ---
  // Example: assetPath = "sub-mouse1/sub-mouse1_ecephys.nwb"
  //          externalFile = "../video_left_camera.avi"
  //
  // Get the NWB file's directory:
  //   "sub-mouse1/sub-mouse1_ecephys.nwb"
  //     .split("/")    -> ["sub-mouse1", "sub-mouse1_ecephys.nwb"]
  //     .slice(0, -1)  -> ["sub-mouse1"]          (drop the filename)
  //     .join("/")      -> "sub-mouse1"
  const assetDir = assetPath.split("/").slice(0, -1).join("/");
  // Clean up the relative path:
  //   "../video_left_camera.avi"
  //     .replace(/\\/g, "/")   -> "../video_left_camera.avi"  (convert Windows backslashes)
  //     .replace(/^[./]+/, "") -> "video_left_camera.avi"     (strip leading ../ prefix)
  const cleanRelativePath = externalFile
    .replace(/\\/g, "/")
    .replace(/^[./]+/, "");
  // Combine: "sub-mouse1" + "/" + "video_left_camera.avi" = "sub-mouse1/video_left_camera.avi"
  // If NWB is at the root (assetDir is ""), just use the clean path alone.
  //
  // Limitation: this does not properly resolve ".." by walking up directories.
  // For "a/b/c/file.nwb" with external_file "../../video.avi", a real path
  // resolver would give "a/video.avi", but we produce "a/b/c/video.avi".
  // This works for the dandisets we've seen (flat or single-level structures)
  // but would need a proper path resolver for deeply nested layouts.
  const fullVideoAssetPath = assetDir
    ? `${assetDir}/${cleanRelativePath}`
    : cleanRelativePath;

  // --- Step 6: Search the dandiset for the video asset ---
  // We know the video's path within the dandiset, but DANDI serves files by
  // asset ID, not by path. So we search the DANDI API to find the asset ID.
  const videoAssetId = await findDandiAssetIdByPath(
    apiBaseUrl,
    dandisetId,
    dandisetVersion,
    fullVideoAssetPath,
    headers,
  );

  // --- Step 7: Follow the download redirect to get the final S3 URL ---
  // DANDI's /download/ endpoint doesn't serve the file directly. It redirects
  // to a signed S3 URL. We fetch it to let the browser follow the redirect,
  // grab the final URL from response.url, then immediately abort the connection
  // since we only needed the URL, not the file content.
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
  width = 800,
  height = 600,
  nwbUrl,
  path,
}) => {
  // Read URL query params (?dandisetId=...&dandisetVersion=...) needed for DANDI API calls
  const [searchParams] = useSearchParams();

  // Component state: each useState returns [currentValue, setterFunction].
  // Calling a setter triggers React to re-render the component with the new value.
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  // Tracks whether the browser failed to play the video (unsupported codec/container)
  const [playbackError, setPlaybackError] = useState(false);

  // useEffect runs the async URL resolution after the component renders.
  // It re-runs whenever nwbUrl, path, or searchParams change (the dependency array at the end).
  useEffect(() => {
    // Guard flag: if the component unmounts while async work is in progress,
    // we set this to true so the callbacks don't update state on a dead component.
    let canceled = false;
    const load = async () => {
      // Reset state before starting (handles re-resolution when dependencies change)
      setLoading(true);
      setError(undefined);
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
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };
    load();
    // Cleanup function: React calls this when the component unmounts
    // or before re-running the effect, preventing stale state updates.
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path, searchParams]); //if those change, useEffect runs again

  // Render: early returns handle loading and error states.
  // React components return one thing, so each branch is a complete render.
  if (loading) {
    return <div style={{ padding: "20px" }}>Resolving external video...</div>;
  }

  if (error) {
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
        {error}
      </div>
    );
  }

  // Success: render the native HTML <video> element with the resolved URL
  return (
    <div
      style={{
        padding: "20px",
        width: "100%",
        maxWidth: playbackError ? 960 : 1600,
        margin: "0 auto",
      }}
    >
      {/* Browser can't decode this codec/container */}
      {playbackError && (
        <div
          style={{
            padding: "18px 20px",
            border: "1px solid #f1b5b5",
            borderRadius: 8,
            background: "#fff5f5",
            color: "#8a1c1c",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Video Not Supported
          </div>
          This video could not be played because its container or codec is not
          supported by the browser. Most likely, the uploaded video uses a format
          like AVI with a non-browser-friendly codec.
        </div>
      )}
      {/* Video player */}
      {!playbackError && (
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
            onError={() => setPlaybackError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default ExternalFileVideoView;
