import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";
import "../base.css";
import "./Tabs.css";

export interface TabItem {
  id: string;
  label: string;
  /** Object tabs: whether the tab can be closed. Main can't. */
  closable?: boolean;
  /** Shown on hover and focus, such as an object's full path. */
  tooltip?: string;
  /** Pushes this tab and the ones after it to the end of the bar, such as Schema and HDF5. */
  end?: boolean;
}

interface TabsProps {
  /** Unique on the page; tabs and panels derive their ids from it. */
  id: string;
  label: string;
  tabs: TabItem[];
  selected: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  kind?: "section" | "object";
}

const tabId = (tabsId: string, id: string) => `${tabsId}-tab-${id}`;
const panelId = (tabsId: string, id: string) => `${tabsId}-panel-${id}`;

/** A WAI-ARIA tab list. Arrow keys move and select; Delete closes a closable object tab. */
export function Tabs({
  id,
  label,
  tabs,
  selected,
  onSelect,
  onClose,
  kind = "section",
}: TabsProps) {
  const list = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  useEffect(() => {
    const tab = document.getElementById(tabId(id, selected));
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (refocus.current) {
      refocus.current = false;
      tab?.focus();
    }
  }, [id, selected, tabs]);

  const go = (index: number) => {
    const target = tabs[(index + tabs.length) % tabs.length];
    onSelect(target.id);
    document.getElementById(tabId(id, target.id))?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number, tab: TabItem) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      go(moves[event.key]);
    } else if (event.key === "Delete" && tab.closable && onClose) {
      event.preventDefault();
      refocus.current = true;
      onClose(tab.id);
    }
  };

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className={`ns-tabs ns-tabs--${kind}`}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.id === selected;
        const closable = Boolean(tab.closable && onClose);
        const button = (
          <button
            type="button"
            role="tab"
            id={tabId(id, tab.id)}
            aria-selected={isSelected}
            aria-controls={panelId(id, tab.id)}
            aria-keyshortcuts={closable ? "Delete" : undefined}
            tabIndex={isSelected ? 0 : -1}
            className="ns-tab"
            data-label={tab.label}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index, tab)}
          >
            {tab.label}
          </button>
        );
        return (
          <span
            key={tab.id}
            className={
              tab.end && !tabs[index - 1]?.end
                ? "ns-tab-item ns-tab-item--end"
                : "ns-tab-item"
            }
            role="presentation"
          >
            {tab.tooltip ? (
              <Tooltip label={tab.tooltip} placement="bottom">
                {button}
              </Tooltip>
            ) : (
              button
            )}
            {closable && (
              // Delete closes from the keyboard; ARIA tab lists may only hold tabs.
              <span
                aria-hidden="true"
                className="ns-tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose!(tab.id);
                }}
              >
                <Icon name="close" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  tabsId: string;
  tabId: string;
  selected: boolean;
  children: ReactNode;
}

/** The content a tab shows. Unselected panels stay mounted but hidden, so views keep their state. */
export function TabPanel({
  tabsId,
  tabId: id,
  selected,
  children,
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId(tabsId, id)}
      aria-labelledby={tabId(tabsId, id)}
      hidden={!selected}
      tabIndex={0}
      className="ns-tab-panel"
    >
      {children}
    </div>
  );
}
