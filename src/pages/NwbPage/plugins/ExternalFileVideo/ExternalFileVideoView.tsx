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
