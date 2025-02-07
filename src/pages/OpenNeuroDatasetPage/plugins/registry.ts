import { OpenNeuroPlugin, pluginSupportsFile } from "./pluginInterface";

const plugins: OpenNeuroPlugin[] = [];

export const registerPlugin = (plugin: OpenNeuroPlugin) => {
  plugins.push(plugin);
};

export const findPluginsByFile = (filename: string): OpenNeuroPlugin[] => {
  return plugins
    .filter((plugin) => pluginSupportsFile(plugin, filename))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
};

export const findPluginByName = (name: string): OpenNeuroPlugin | undefined => {
  return plugins.find((p) => p.name === name);
};

// Get all registered plugins
export const getPlugins = (): OpenNeuroPlugin[] => {
  return [...plugins];
};
