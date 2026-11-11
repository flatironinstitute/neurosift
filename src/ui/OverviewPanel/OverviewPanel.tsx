import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  DescriptionList,
  type Description,
} from "../DescriptionList/DescriptionList";
import { IconButton } from "../IconButton/IconButton";
import "../base.css";
import "./OverviewPanel.css";

const PANEL_MIN = 240;
const PANEL_MAX = 480;
const STEP = 16;

interface OverviewPanelProps {
  title: string;
  groups: { title: string; items: Description[] }[];
  /** Anything after the groups, such as a description in a Disclosure. */
  children?: ReactNode;
  width: number;
  onWidthChange: (width: number) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const clamp = (width: number) =>
  Math.min(PANEL_MAX, Math.max(PANEL_MIN, width));
const lower = (title: string) => title[0].toLowerCase() + title.slice(1);

/** The panel on the left of the file viewer: what the session is, resizable and collapsible to a rail. */
export function OverviewPanel({
  title,
  groups,
  children,
  width,
  onWidthChange,
  collapsed,
  onCollapsedChange,
}: OverviewPanelProps) {
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    panel.current?.style.setProperty(
      "--ns-overview-panel-width",
      `${clamp(width)}px`,
    );
  }, [width, collapsed]);

  if (collapsed)
    return (
      <div className="ns-overview-panel-rail">
        <IconButton
          icon="chevron--right"
          label={`Show ${lower(title)}`}
          variant="ghost"
          size="sm"
          tooltipPlacement="right"
          onClick={() => onCollapsedChange(false)}
        />
      </div>
    );

  const onKey = (event: KeyboardEvent) => {
    const next = {
      ArrowLeft: width - STEP,
      ArrowRight: width + STEP,
      Home: PANEL_MIN,
      End: PANEL_MAX,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onWidthChange(clamp(next));
  };

  const onDrag = (event: PointerEvent<HTMLDivElement>) => {
    const left = panel.current?.getBoundingClientRect().left ?? 0;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (moved: globalThis.PointerEvent) =>
      onWidthChange(clamp(moved.clientX - left));
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
  };

  return (
    <section ref={panel} className="ns-overview-panel" aria-label={title}>
      <div className="ns-overview-panel-scroll">
        <div className="ns-overview-panel-header">
          <p className="ns-overview-panel-title">{title}</p>
          <IconButton
            icon="chevron--left"
            label={`Hide ${lower(title)}`}
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(true)}
          />
        </div>
        {groups.map((group) => (
          <div className="ns-overview-panel-group" key={group.title}>
            <p className="ns-overview-panel-group-title">{group.title}</p>
            <DescriptionList label={group.title} items={group.items} />
          </div>
        ))}
        {children}
      </div>
      <div
        className="ns-overview-panel-handle"
        role="separator"
        aria-label={`Resize ${lower(title)}`}
        aria-orientation="vertical"
        aria-valuenow={clamp(width)}
        aria-valuemin={PANEL_MIN}
        aria-valuemax={PANEL_MAX}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onDrag}
      />
    </section>
  );
}
