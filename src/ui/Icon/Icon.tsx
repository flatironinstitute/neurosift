import { ICONS, type IconName } from "./icons";
import "./Icon.css";

export type { IconName };
export type IconSize = "sm" | "md" | "lg" | "xl";

interface IconProps {
  name: IconName;
  size?: IconSize;
  label?: string;
}

export function Icon({ name, size = "sm", label }: IconProps) {
  const a11y = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true, focusable: false };
  return (
    <svg
      className={`ns-icon ns-icon--${size}`}
      viewBox="0 0 32 32"
      fill="currentColor"
      {...a11y}
    >
      {ICONS[name].map((path) => (
        <path
          key={path.d}
          d={path.d}
          fillRule={"evenOdd" in path ? "evenodd" : undefined}
        />
      ))}
    </svg>
  );
}
