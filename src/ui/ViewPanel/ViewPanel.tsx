import type { ReactNode } from "react";
import { Alert } from "../Alert/Alert";
import "../base.css";
import "./ViewPanel.css";

interface ViewPanelProps {
  /** The object’s name, which names the region. */
  label: string;
  /** One sentence on what is drawn, such as “LFPs: 70 channels at 400 Hz, 1,375.28 s.” */
  summary: string;
  /** Time controls first, then the view’s options. */
  controls: ReactNode;
  /** The Time overview, on views whose x axis is recording time. */
  overview?: ReactNode;
  /** Accordion items, in a 320px panel beside the plot. */
  settings?: ReactNode;
  chartTitle?: string;
  /** Set while the plot’s data loads, so screen readers don’t read half-drawn content. */
  busy?: boolean;
  /** The chart, or the loading, empty or too-much-data state in its place. */
  children: ReactNode;
}

/** The frame every view of a neurodata object shares; the chart inside stays Neurosift’s own. */
export function ViewPanel({
  label,
  summary,
  controls,
  overview,
  settings,
  chartTitle,
  busy = false,
  children,
}: ViewPanelProps) {
  return (
    <section
      className={settings ? "ns-view ns-view--settings" : "ns-view"}
      aria-label={label}
    >
      <div className="ns-view-main">
        <p className="ns-view-summary">{summary}</p>
        {controls && <div className="ns-view-controls">{controls}</div>}
        {overview}
        {chartTitle && <p className="ns-view-chart-title">{chartTitle}</p>}
        <div className="ns-view-plot" aria-busy={busy || undefined}>
          {children}
        </div>
      </div>
      {settings && (
        <aside className="ns-view-settings" aria-label={`${label} settings`}>
          {settings}
        </aside>
      )}
    </section>
  );
}

/** Two settings side by side in the settings panel, such as high-pass and low-pass. */
export function SettingPair({ children }: { children: ReactNode }) {
  return <div className="ns-setting-pair">{children}</div>;
}

interface TooMuchDataProps {
  /** How much and why, in channels, rate and seconds. */
  children: ReactNode;
  zoomLabel: string;
  onZoom: () => void;
  onDrawAnyway: () => void;
}

/** In place of a plot whose window holds more samples than the browser draws quickly. */
export function TooMuchData({
  children,
  zoomLabel,
  onZoom,
  onDrawAnyway,
}: TooMuchDataProps) {
  return (
    <Alert
      status="warning"
      title="Too much data to draw at this zoom"
      actions={[
        { label: zoomLabel, onClick: onZoom },
        { label: "Draw anyway", onClick: onDrawAnyway },
      ]}
    >
      {children}
    </Alert>
  );
}
