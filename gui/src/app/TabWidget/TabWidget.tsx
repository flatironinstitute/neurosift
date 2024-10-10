import {
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import TabWidgetTabBar from "./TabWidgetTabBar";

type Props = {
  tabs: {
    id: string;
    label: any;
    title?: string;
    closeable: boolean;
    icon?: any;
  }[];
  currentTabId: string | undefined;
  setCurrentTabId: (id: string) => void;
  onCloseTab?: (id: string) => void;
  width: number;
  height: number;
};

const tabBarHeight = 30;

const TabWidget: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
  tabs,
  currentTabId,
  setCurrentTabId,
  onCloseTab,
  width,
  height,
}) => {
  const currentTabIndex = useMemo(() => {
    if (!currentTabId) return undefined;
    const index = tabs.findIndex((t) => t.id === currentTabId);
    if (index < 0) return undefined;
    return index;
  }, [currentTabId, tabs]);
  let children2 = Array.isArray(children)
    ? (children as React.ReactElement[])
    : ([children] as React.ReactElement[]);
  children2 = children2.filter((c) => c);
  if ((children2 || []).length !== tabs.length) {
    throw Error(
      `TabWidget: incorrect number of tabs ${(children2 || []).length} <> ${tabs.length}`,
    );
  }
  const hMargin = 8;
  const vMargin = 8;
  const W = (width || 300) - hMargin * 2;
  const H = height - vMargin * 2;
  const [hasBeenVisible, setHasBeenVisible] = useState<number[]>([]);
  useEffect(() => {
    if (currentTabIndex === undefined) return;
    if (!hasBeenVisible.includes(currentTabIndex)) {
      setHasBeenVisible([...hasBeenVisible, currentTabIndex]);
    }
  }, [currentTabIndex, hasBeenVisible]);
  const handleSetCurrentTabIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= tabs.length) return;
      setCurrentTabId(tabs[index].id);
    },
    [setCurrentTabId, tabs],
  );
  return (
    <div
      style={{
        position: "absolute",
        left: hMargin,
        top: vMargin,
        width: W,
        height: H,
        overflow: "hidden",
      }}
      className="TabWidget"
    >
      <div
        key="tabwidget-bar"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: tabBarHeight,
        }}
      >
        <TabWidgetTabBar
          tabs={tabs}
          currentTabIndex={currentTabIndex}
          onCurrentTabIndexChanged={handleSetCurrentTabIndex}
          onCloseTab={onCloseTab}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: tabBarHeight,
          width: W,
          height: H - tabBarHeight,
        }}
      >
        {children2.map((c, i) => {
          const visible = i === currentTabIndex;
          return (
            <div
              key={`child-${i}`}
              style={{
                display: visible ? undefined : "none",
                overflowY: "hidden",
                overflowX: "hidden",
                position: "absolute",
                left: 0,
                top: 0,
                width: W,
                height: H - tabBarHeight,
                background: "white",
              }}
            >
              {(visible || hasBeenVisible.includes(i)) && (
                <c.type {...c.props} width={W} height={H - tabBarHeight} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabWidget;
