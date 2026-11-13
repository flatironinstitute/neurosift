import ErrorBoundary from "@components/ErrorBoundary";
import { useCssVars } from "@components/useCssVars";
import ViewError from "@components/ViewError/ViewError";
import { objectExists } from "./ObjectTypeUtils";
import { CircularProgress } from "@mui/material";
import { SegmentedControl } from "@ui";
import React, { ReactNode, Suspense, useEffect, useState } from "react";
import ObjectHeaderBar from "./components/ObjectHeaderBar";
import { NwbObjectViewPlugin } from "./plugins/pluginInterface";
import { findSuitablePlugins } from "./plugins/registry";
import { useNwbFileSpecifications } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import {
  useLinkedSettings,
  useShareSettings,
} from "@shared/shareLink/useShareSettings";
import { findTableOrChart, hiddenPlugin, viewToStore } from "./tableOrChart";

const VIEW_SETTING = "view";

interface NwbObjectViewProps {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => void;
  plugin?: NwbObjectViewPlugin;
  secondaryPaths?: string[];
  width: number | undefined;
  height: number | undefined;
  inMultiView?: boolean;
}

const NwbObjectView: React.FC<NwbObjectViewProps> = ({
  nwbUrl,
  path,
  objectType,
  onOpenObjectInNewTab,
  plugin,
  secondaryPaths,
  width,
  height,
  inMultiView,
}) => {
  const linked = useLinkedSettings();
  const [view, setView] = useState<string | undefined>(
    linked.get(VIEW_SETTING) ?? undefined,
  );
  // The plugins resolved so far, tagged with the object they were resolved
  // for. When only the specifications change (they arrive after the first
  // render) the previously resolved plugins stay mounted while the new
  // resolution runs, so open views keep their state instead of remounting.
  const objectKey = `${nwbUrl}|${path}|${objectType}|${plugin?.name ?? ""}|${
    inMultiView ? 1 : 0
  }`;
  const [resolved, setResolved] = useState<{
    key: string;
    plugins: NwbObjectViewPlugin[];
    missing?: boolean;
  }>();

  const specifications = useNwbFileSpecifications();

  useEffect(() => {
    let canceled = false;
    const loadPlugin = async () => {
      if (!(await objectExists(nwbUrl, path))) {
        if (!canceled)
          setResolved({ key: objectKey, plugins: [], missing: true });
        return;
      }
      if (plugin) {
        if (!canceled) setResolved({ key: objectKey, plugins: [plugin] });
        return;
      }
      try {
        {
          let suitable = await findSuitablePlugins(nwbUrl, path, objectType, {
            specifications,
            launchableFromTable: false,
          });
          if (canceled) return;
          {
            // only include plugins that do not have hideFromObjectView set to true
            const suitable2 = suitable.filter(
              (plugin) => !plugin.hideFromObjectView,
            );
            suitable = suitable2;
          }
          if (inMultiView) {
            // If we are in a multi-view, then we only use plugins that have showInMultiView set to true
            // but if there are no such plugins, then we use the default plugin
            let suitable2 = suitable.filter((plugin) => plugin.showInMultiView);
            if (suitable2.length === 0) {
              suitable2 = suitable.filter(
                (plugin) => plugin.name === "default",
              );
            }
            suitable = suitable2;
          }
          setResolved({ key: objectKey, plugins: suitable });
        }
      } catch (err) {
        if (canceled) return;
        console.error("Error finding suitable plugin:", err);
        setResolved({ key: objectKey, plugins: [] });
      }
    };
    loadPlugin();
    return () => {
      canceled = true;
    };
  }, [
    path,
    objectType,
    nwbUrl,
    plugin,
    inMultiView,
    specifications,
    objectKey,
  ]);

  const pair =
    resolved?.key === objectKey
      ? findTableOrChart(
          resolved.plugins.map((p) => p.name),
          !!inMultiView,
          view,
        )
      : undefined;
  useShareSettings(
    pair
      ? [
          {
            key: VIEW_SETTING,
            value: pair.shown,
            default: pair.defaultView,
            label: "the view",
          },
        ]
      : [],
  );
  const viewSwitch = pair && (
    <span className="file-object-switch">
      <span aria-hidden="true">Show</span>
      <SegmentedControl
        label={`Show ${path} as`}
        size="sm"
        options={pair.options}
        value={pair.shown}
        onChange={(value) => setView(viewToStore(pair, value))}
      />
    </span>
  );
  const withHeader = (content: ReactNode) =>
    inMultiView ? (
      <>
        <ObjectHeaderBar path={path}>{viewSwitch}</ObjectHeaderBar>
        {content}
      </>
    ) : (
      <>
        {viewSwitch && <SwitchRow width={width}>{viewSwitch}</SwitchRow>}
        {content}
      </>
    );

  if (!resolved || resolved.key !== objectKey) {
    return withHeader(<CircularProgress />);
  }
  if (resolved.missing) {
    return withHeader(
      <ViewError what={path} error={`This file has no object at ${path}.`} />,
    );
  }
  const hidden = pair && hiddenPlugin(pair);
  const plugins = resolved.plugins.filter((p) => p.name !== hidden);

  if (plugins.length === 0) {
    return withHeader(<div>Error: No suitable plugin found</div>);
  }

  const componentWidth = width;
  let componentHeight = height;
  if (plugins.length > 1) {
    componentHeight = Math.max(500, ((height || 800) * 3) / 4);
  }

  return withHeader(
    <div style={{ position: "relative", width, height }}>
      {plugins.slice().map((plugin) => {
        const PluginComponent = plugin.component;
        return (
          <div key={plugin.name}>
            <ErrorBoundary
              what={`the ${plugin.label ?? plugin.name} view of ${path}`}
            >
              <Suspense fallback={<CircularProgress />}>
                <PluginComponent
                  nwbUrl={nwbUrl}
                  path={path}
                  objectType={objectType}
                  onOpenObjectInNewTab={onOpenObjectInNewTab}
                  secondaryPaths={secondaryPaths}
                  width={componentWidth}
                  height={componentHeight || 300}
                  condensed={inMultiView}
                />
              </Suspense>
            </ErrorBoundary>
            {!inMultiView && <hr />}
          </div>
        );
      })}
    </div>,
  );
};

/** Above an object in its own tab, ending where the object's views end. */
const SwitchRow: React.FC<{ width?: number; children: ReactNode }> = ({
  width,
  children,
}) => {
  const ref = useCssVars<HTMLDivElement>(
    width ? { "--object-width": width } : {},
  );
  return (
    <div ref={ref} className="file-object-switch-row">
      {children}
    </div>
  );
};

export default NwbObjectView;
