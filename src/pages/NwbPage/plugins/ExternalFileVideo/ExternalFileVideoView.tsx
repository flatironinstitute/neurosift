import { FunctionComponent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { resolveExternalVideoUrl } from "../../externalVideoUtils";

type Props = {
  width?: number;
  height?: number;
  nwbUrl: string;
  path: string;
};

const ExternalFileVideoView: FunctionComponent<Props> = ({
  height = 600,
  nwbUrl,
  path,
}) => {
  // Read URL query params (?dandisetId=...&dandisetVersion=...) needed for DANDI API calls
  const [searchParams] = useSearchParams();

  // Component state: each useState returns [currentValue, setterFunction].
  // Calling a setter triggers React to re-render the component with the new value.
  const [videoUrl, setVideoUrl] = useState<string>();
  const [urlResolutionError, setUrlResolutionError] = useState<string>();
  const [loading, setLoading] = useState(true);
  // Tracks whether the browser failed to play the video (unsupported codec/container)
  const [codecError, setCodecError] = useState(false);

  // Resolve the playable video URL from the ImageSeries external_file.
  // If external_file is an absolute URL it is used directly; if it is a
  // relative path (e.g. "../video.avi") it is resolved through the DANDI API
  // by looking up the NWB asset's path and searching for the video asset.
  // Re-runs whenever nwbUrl, path, or searchParams change (the dependency array at the end).
  useEffect(() => {
    // Guard flag: if the component unmounts while async work is in progress,
    // we set this to true so the callbacks don't update state on a dead component.
    let canceled = false;
    const load = async () => {
      // Reset state before starting (handles re-resolution when dependencies change)
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

  // Both error types (URL resolution failure and browser codec failure) share
  // the same "Video Unavailable" panel. urlResolutionError is set during the
  // useEffect when the async URL resolution fails. codecError is set later,
  // when the <video> element's onError fires because the browser can't decode
  // the video. On that re-render, codecError is true, so we return the error
  // panel instead of the <video> element.
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
  // Success: render the native HTML <video> element with the resolved URL
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
