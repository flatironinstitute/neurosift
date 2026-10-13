import { Alert, AlertTitle, Button } from "@mui/material";
import { Component, ErrorInfo, ReactNode } from "react";
import {
  errorMessage,
  issueUrlForError,
  reportError,
} from "../util/reportError";

type Props = {
  // What is inside, as it reads in "Something went wrong in ...", e.g.
  // "this view" or "the HDF5 tab".
  what: string;
  // The boundary clears its error when this value changes. Use it for content
  // that is replaced without remounting the boundary, such as a route.
  resetKey?: unknown;
  children: ReactNode;
};

type State = { error: unknown; hasError: boolean };

/**
 * Keeps an error thrown while rendering its children from taking down the
 * rest of the app. The children are replaced by a message with a retry button
 * and a link that opens a pre-filled GitHub issue, and the error is logged.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: undefined, hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportError(error, {
      source: "render",
      componentStack: info.componentStack ?? undefined,
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: undefined, hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const { what } = this.props;
    return (
      <Alert
        severity="error"
        sx={{ m: 1 }}
        action={
          <>
            <Button color="inherit" size="small" onClick={this.reset}>
              Try again
            </Button>
            <Button
              color="inherit"
              size="small"
              href={issueUrlForError(error, what)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Report this
            </Button>
          </>
        }
      >
        <AlertTitle>Something went wrong in {what}</AlertTitle>
        <code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {errorMessage(error)}
        </code>
      </Alert>
    );
  }
}

export default ErrorBoundary;
