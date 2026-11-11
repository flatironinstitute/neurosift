import { Component, ErrorInfo, ReactNode } from "react";
import ViewError from "./ViewError/ViewError";
import { reportError } from "../util/reportError";

type Props = {
  // What is inside, in plain words, as it reads in "... couldn't be shown",
  // e.g. "this page" or "the timeseries alignment".
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
    return <ViewError what={what} error={error} onRetry={this.reset} />;
  }
}

export default ErrorBoundary;
