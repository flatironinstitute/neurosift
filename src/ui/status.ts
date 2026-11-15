import type { IconName } from "./Icon/Icon";

export type Status = "info" | "success" | "warning" | "error";

export const STATUS_ICONS: Record<Status, IconName> = {
  info: "information",
  success: "checkmark--outline",
  warning: "warning--alt",
  error: "error",
};

/** Errors interrupt; everything else waits for a pause. */
export const liveRole = (status: Status) =>
  status === "error" ? "alert" : "status";
