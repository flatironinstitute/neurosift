import { CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { NwbObjectViewPlugin } from "./plugins/pluginInterface";
import { findSuitablePlugins } from "./plugins/registry";
import { useNwbFileSpecifications } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";

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
  }>();

  const specifications = useNwbFileSpecifications();

  useEffect(() => {
    if (plugin) {
      setResolved({ key: objectKey, plugins: [plugin] });
      return;
    }
    let canceled = false;
    const loadPlugin = async () => {
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

  if (!resolved || resolved.key !== objectKey) {
    return <CircularProgress />;
  }
  const plugins = resolved.plugins;

  if (plugins.length === 0) {
    return <div>Error: No suitable plugin found</div>;
  }

  const componentWidth = width;
  let componentHeight = height;
  if (plugins.length > 1) {
    componentHeight = Math.max(500, ((height || 800) * 3) / 4);
  }

  return (
    <div style={{ position: "relative", width, height }}>
      {plugins.slice().map((plugin) => {
        const PluginComponent = plugin.component;
        return (
          <div key={plugin.name}>
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
            {!inMultiView && <hr />}
          </div>
        );
      })}
    </div>
  );
};

export default NwbObjectView;
