import { DatasetPlugin, pluginSupportsFile } from "./pluginInterface";

const plugins: DatasetPlugin[] = [];

export const registerPlugin = (plugin: DatasetPlugin) => {
  plugins.push(plugin);
};

export const findPluginsByFile = (filename: string): DatasetPlugin[] => {
  return plugins
    .filter((plugin) => pluginSupportsFile(plugin, filename))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
};

export const findPluginByName = (name: string): DatasetPlugin | undefined => {
  return plugins.find((p) => p.name === name);
};

// Get all registered plugins
export const getPlugins = (): DatasetPlugin[] => {
  return [...plugins];
};
