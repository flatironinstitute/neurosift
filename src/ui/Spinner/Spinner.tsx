import "../base.css";
import "./Spinner.css";

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label }: SpinnerProps) {
  const arc = (
    <svg
      className="ns-spinner-arc"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="33 11"
      />
    </svg>
  );
  if (!label)
    return (
      <span className="ns-spinner" aria-hidden="true">
        {arc}
      </span>
    );
  return (
    <span className="ns-spinner" role="status">
      {arc}
      <span className="ns-visually-hidden">{label}</span>
    </span>
  );
}
