import { Alert } from "@ui";
import { FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { VideoProblem } from "./externalVideoUtils";

const ACCESS_HINT =
  "The link may have expired, or the Dandiset may need a DANDI API key.";

/** In place of a video that can't be retrieved or played. */
const VideoUnavailable: FunctionComponent<{ problem: VideoProblem }> = ({
  problem,
}) => {
  const navigate = useNavigate();
  if (problem.kind === "format")
    return (
      <Alert status="error">
        This browser can't play this video's format. AVI files often can't play
        in browsers.
      </Alert>
    );
  if (problem.kind === "other")
    return (
      <Alert status="error" detail={problem.message}>
        This video couldn't be retrieved.
      </Alert>
    );
  return (
    <Alert
      status="error"
      actions={[
        { label: "Open settings", onClick: () => navigate("/settings") },
      ]}
    >
      {problem.kind === "http"
        ? `This video couldn't be retrieved (HTTP ${problem.status}). ${ACCESS_HINT}`
        : `This video couldn't be retrieved. ${ACCESS_HINT}`}
    </Alert>
  );
};

export default VideoUnavailable;
