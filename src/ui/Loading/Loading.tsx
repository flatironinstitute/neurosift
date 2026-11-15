import { Button } from "../Button/Button";
import { Spinner } from "../Spinner/Spinner";
import "../base.css";
import "./Loading.css";

import type { LoadingPhase } from "./useLoadingPhase";

export interface Progress {
  value: number;
  max: number;
  unit: string;
}

type Action = { label: string; onClick: () => void };

interface ProgressBarProps extends Progress {
  label: string;
}

export function ProgressBar({ label, value, max, unit }: ProgressBarProps) {
  const amount = `${value.toLocaleString("en-US")} of ${max.toLocaleString("en-US")} ${unit}`;
  return (
    <div className="ns-progress">
      <span className="ns-progress-text">
        {label}, {amount}
      </span>
      <progress
        className="ns-progress-bar"
        value={value}
        max={max}
        aria-label={label}
        aria-valuetext={amount}
      />
    </div>
  );
}

interface LoadingStateProps {
  /** What is loading, such as “Loading LFPs”. */
  label: string;
  phase: LoadingPhase;
  progress?: Progress;
  slow?: { message: string; actions?: Action[] };
}

/** Stands in for a view’s data while it loads; everything already known stays drawn around it. */
export function LoadingState({
  label,
  phase,
  progress,
  slow,
}: LoadingStateProps) {
  if (phase === "hidden") return null;
  if (phase === "slow" && slow)
    return (
      <div className="ns-loading">
        <p className="ns-loading-text" role="status">
          {slow.message}
        </p>
        {slow.actions && (
          <div className="ns-loading-actions">
            {slow.actions.map(({ label: action, onClick }) => (
              <Button key={action} size="sm" onClick={onClick}>
                {action}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  return (
    <div className="ns-loading">
      {progress ? (
        <ProgressBar label={label} {...progress} />
      ) : (
        <p className="ns-loading-text ns-loading-row" role="status">
          <Spinner />
          {label}…
        </p>
      )}
    </div>
  );
}

/** Still placeholder rows for a list that is loading. No shimmer. */
export function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="ns-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => (
        <span className="ns-skeleton-row" key={row} />
      ))}
    </div>
  );
}
