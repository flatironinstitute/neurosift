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
          const suitable = await findSuitablePlugins(nwbUrl, path, objectType, {
            special: false,
          });
          setPlugins(suitable);
        }
      } catch (err) {
        console.error("Error finding suitable plugin:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPlugin();
  }, [path, objectType, nwbUrl, plugin]);

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
    componentHeight = 500;
  }

  return (
    <div style={{ position: "relative", width, height }}>
      {plugins
        .slice()
        .reverse() // reverse it because the most specialized plugins come last
        .map((plugin) => {
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
                height={componentHeight}
              />
              <hr />
            </div>
          );
        })}
    </div>
  );
};

export default NwbObjectView;
