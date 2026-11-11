import type { ReactNode } from "react";
import { Button } from "../Button/Button";
import type { IconName } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";
import "../base.css";
import "./Navigation.css";

export interface AppBarAction {
  label: string;
  href: string;
  icon?: IconName;
  /** Icon only: the label becomes the name and a tooltip. */
  iconOnly?: boolean;
  external?: boolean;
}

interface AppBarProps {
  homeHref: string;
  /** The mark beside the name; decorative, since the link is named. */
  logo: ReactNode;
  name?: string;
  actions: AppBarAction[];
}

/** The whole tool's bar: the name links home, and labeled actions sit on the right. */
export function AppBar({
  homeHref,
  logo,
  name = "Neurosift",
  actions,
}: AppBarProps) {
  return (
    <header className="ns-app-bar">
      <a className="ns-app-bar-home" href={homeHref}>
        <span className="ns-app-bar-logo" aria-hidden="true">
          {logo}
        </span>
        <span className="ns-app-bar-name">{name}</span>
      </a>
      <div className="ns-app-bar-actions">
        {actions.map(({ label, href, icon, iconOnly, external }) => {
          const link = (
            <Button
              key={label}
              href={href}
              variant="ghost"
              icon={icon}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-label={iconOnly ? label : undefined}
            >
              {iconOnly ? (
                <span className="ns-visually-hidden">{label}</span>
              ) : (
                label
              )}
            </Button>
          );
          return iconOnly ? (
            <Tooltip key={label} label={label} placement="bottom">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </div>
    </header>
  );
}
