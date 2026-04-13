import { FunctionComponent, useState } from "react";

type Props = {
  videoUrl: string;
  width: number;
  height: number;
};

const VideoViewer: FunctionComponent<Props> = ({ videoUrl, height }) => {
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  return (
    <div
      style={{
        padding: "20px",
        width: "100%",
        maxWidth: playbackError ? 960 : 1600,
        margin: "0 auto",
      }}
    >
      {playbackError && (
        <div
          style={{
            marginBottom: "12px",
            padding: "18px 20px",
            border: "1px solid #f1b5b5",
            borderRadius: 8,
            background: "#fff5f5",
            color: "#8a1c1c",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Video Not Supported
          </div>
          <div style={{ lineHeight: 1.5 }}>{playbackError}</div>
        </div>
      )}
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
          {!metadataLoaded && (
            <div style={{ color: "#ccc", fontSize: 14 }}>Loading video...</div>
          )}
          <video
            controls
            src={videoUrl}
            onError={() =>
              setPlaybackError(
                "This video could not be played by the browser because its container or codec is not supported. Most likely, the uploaded video uses a non-browser-supported codec or container.",
              )
            }
            onLoadedMetadata={() => setMetadataLoaded(true)}
            onLoadedData={() => setPlaybackError(null)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: metadataLoaded ? "block" : "none",
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default VideoViewer;
