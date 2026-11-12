import { FunctionComponent, useState, useEffect } from "react";
import { IconButton, Tooltip } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";

type ShareTabButtonProps = {
  tabId: string;
  nwbUrl: string;
};

const ShareTabButton: FunctionComponent<ShareTabButtonProps> = ({
  tabId,
  nwbUrl,
}) => {
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    let timer: number;
    if (showCopied) {
      timer = window.setTimeout(() => {
        setShowCopied(false);
      }, 4500);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [showCopied]);

  const handleShare = () => {
    // Create URL with both nwb file and tab parameters
    const url = new URL(window.location.href);
    url.searchParams.set("url", nwbUrl);
    url.searchParams.set("tab", tabId);

    // Get the raw string but decode the specific parameters we want unencoded
    let urlString = url.toString();
    urlString = urlString.replace(
      `url=${encodeURIComponent(nwbUrl)}`,
      `url=${nwbUrl}`,
    );
    urlString = urlString.replace(
      `tab=${encodeURIComponent(tabId)}`,
      `tab=${tabId}`,
    );

    // Copy to clipboard
    navigator.clipboard.writeText(urlString).then(() => {
      setShowCopied(true);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Tooltip title="Share tab URL">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation(); // Prevent tab switching
            handleShare();
          }}
          sx={{
            padding: "4px",
            backgroundColor: "#fff",
            "&:hover": {
              backgroundColor: "#f0f0f0",
            },
          }}
        >
          <ShareIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
      {showCopied && (
        <span
          style={{
            marginLeft: "8px",
            fontSize: "12px",
            color: "#666",
          }}
        >
          Copied!
        </span>
      )}
    </div>
  );
};

export default ShareTabButton;
