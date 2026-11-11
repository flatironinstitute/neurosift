import { Alert, type AlertAction } from "@ui";
import { errorMessage, issueUrlForError } from "../../util/reportError";
import "./ViewError.css";

interface ViewErrorProps {
  /** What failed, in plain words, as it reads in "... couldn't be shown": "the spectrogram", "this file". */
  what: string;
  error: unknown;
  onRetry?: () => void;
}

/** The one way a view says it couldn't be shown: what failed, the cause, and what people can do. */
const ViewError = ({ what, error, onRetry }: ViewErrorProps) => {
  const report: AlertAction = {
    label: "Report this",
    href: issueUrlForError(error, what),
    newTab: true,
  };
  return (
    <div className="view-error">
      <Alert
        status="error"
        title={`${what[0].toUpperCase()}${what.slice(1)} couldn’t be shown`}
        detail={errorMessage(error)}
        actions={
          onRetry
            ? [{ label: "Try again", onClick: onRetry }, report]
            : [report]
        }
      >
        {onRetry
          ? "Try again, or report it if it keeps happening."
          : "Report it if it keeps happening."}
      </Alert>
    </div>
  );
};

export default ViewError;
