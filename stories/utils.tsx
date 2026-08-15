import type { ReactNode } from "react";

/**
 * Wraps a story in a fixed-size, position-relative box.
 *
 * Several Neurosift components (TabBar, ScrollY, the page components, ...) lay
 * themselves out with `position: absolute` and expect explicit `width`/`height`
 * props from their parent. Rendering them straight into the Storybook canvas
 * would anchor them to the viewport and make the snapshot depend on the
 * canvas size; this container gives them a deterministic frame instead.
 */
export const Frame = ({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) => (
  <div
    style={{
      position: "relative",
      width,
      height,
      border: "1px solid #e0e0e0",
      background: "#ffffff",
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

/**
 * Centers a story at a realistic content width, for components that are
 * normally rendered inside a page container rather than absolutely positioned.
 */
export const Centered = ({ children }: { children: ReactNode }) => (
  <div style={{ maxWidth: 640, margin: "1.5rem auto", padding: "0 1rem" }}>
    {children}
  </div>
);
