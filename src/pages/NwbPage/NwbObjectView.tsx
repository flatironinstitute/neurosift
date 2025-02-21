import { CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { NwbObjectViewPlugin } from "./plugins/pluginInterface";
import { findSuitablePlugins } from "./plugins/registry";

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
  const [plugins, setPlugins] = useState<NwbObjectViewPlugin[] | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plugin) {
      setPlugins([plugin]);
      setLoading(false);
      return;
    }
    const loadPlugin = async () => {
      setLoading(true);
      try {
        if (plugin) {
          setPlugins([plugin]);
        } else {
          let suitable = await findSuitablePlugins(nwbUrl, path, objectType, {
            launchableFromTable: false,
          });
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
          setPlugins(suitable);
        }
      } catch (err) {
        console.error("Error finding suitable plugin:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPlugin();
  }, [path, objectType, nwbUrl, plugin, inMultiView]);

  if (loading) {
    return <CircularProgress />;
  }

  if (!plugins) {
    throw new Error("Plugins is undefined");
  }

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
