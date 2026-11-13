import type { ReactNode } from "react";

export interface ToolbarItem {
  type: "button";
  callback: () => void;
  title: string;
  icon: ReactNode;
  keyCode?: number;
  disabled?: boolean;
}
