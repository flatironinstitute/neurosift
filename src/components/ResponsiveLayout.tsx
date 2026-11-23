import React, { FunctionComponent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HorizontalSplitter from "./HorizontalSplitter";

/** The link parameter that keeps the left panel folded: ?overview=hidden. */
export const OVERVIEW_PARAM = "overview";

export interface ResponsiveLayoutProps {
  width: number;
  height: number;
  initialSplitterPosition: number;
  mobileBreakpoint?: number;
  children: [React.ReactNode, React.ReactNode]; // Exactly two children required
}

const ResponsiveLayout: FunctionComponent<ResponsiveLayoutProps> = ({
  width,
  height,
  initialSplitterPosition,
  mobileBreakpoint = 768, // Common mobile breakpoint
  children,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const { search, hash } = useLocation();
  const navigate = useNavigate();
  const collapsed =
    new URLSearchParams(search).get(OVERVIEW_PARAM) === "hidden";
  const setCollapsed = (next: boolean) => {
    const params = new URLSearchParams(search);
    if (next) params.set(OVERVIEW_PARAM, "hidden");
    else params.delete(OVERVIEW_PARAM);
    // Slashes read better unencoded and are allowed in a query.
    const query = params.toString().replace(/%2F/gi, "/");
    navigate({ search: query ? `?${query}` : "", hash }, { replace: true });
  };

  useEffect(() => {
    setIsMobile(window.innerWidth <= mobileBreakpoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this only runs once on mount

  if (isMobile) {
    // Stack the panels vertically on mobile
    const topHeight = Math.max(200, Math.min(500, height * 0.4));
    const bottomHeight = height - topHeight;

    return (
      <div style={{ position: "relative", width, height }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height: topHeight,
            overflow: "hidden",
          }}
        >
          {React.cloneElement(children[0] as React.ReactElement, {
            width,
            height: topHeight,
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: topHeight,
            width,
            height: bottomHeight,
            overflow: "hidden",
          }}
        >
          {React.cloneElement(children[1] as React.ReactElement, {
            width,
            height: bottomHeight,
          })}
        </div>
      </div>
    );
  }

  // Use horizontal splitter for desktop
  return (
    <HorizontalSplitter
      width={width}
      height={height}
      initialSplitterPosition={initialSplitterPosition}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
    >
      {children}
    </HorizontalSplitter>
  );
};

export default ResponsiveLayout;
