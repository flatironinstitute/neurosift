import { FunctionComponent, useEffect, useState } from "react";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

type Props = {
  videoUrl: string;
  width: number;
  height: number;
  dandisetId?: string;
  dandisetVersion?: string;
};

const VideoViewer: FunctionComponent<Props> = ({ videoUrl, width, height }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveVideoUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if it's a DANDI API URL that needs redirect resolution
        const isDandiUrl =
          videoUrl.startsWith("https://api.dandiarchive.org/") ||
          videoUrl.startsWith("https://api.sandbox.dandiarchive.org/") ||
          videoUrl.startsWith("https://api-dandi.emberarchive.org/");

        if (isDandiUrl) {
          // Get authorization header
          const authHeader = getAuthorizationHeaderForUrl(videoUrl);
          const headers = authHeader
            ? { Authorization: authHeader }
            : undefined;

          // Use aborted fetch to get redirect URL (pattern from hdf5Interface.ts)
          const controller = new AbortController();
          const response = await fetch(videoUrl, {
            signal: controller.signal,
            headers,
          });
          controller.abort();

          if (response.url) {
            setResolvedUrl(response.url);
          } else {
            setError("Failed to resolve video URL");
          }
        } else {
          // Direct URL, no redirect needed
          setResolvedUrl(videoUrl);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Error loading video: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    resolveVideoUrl();
  }, [videoUrl]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading video...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>{error}</div>;
  }

  if (!resolvedUrl) {
    return <div style={{ padding: "20px" }}>No video URL available</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <video
        controls
        src={resolvedUrl}
        style={{
          width: Math.min(width - 40, 1200),
          maxHeight: height - 40,
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoViewer;
