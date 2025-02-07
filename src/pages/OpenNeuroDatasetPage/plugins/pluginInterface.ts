import { FunctionComponent } from "react";

export interface OpenNeuroFile {
  id: string;
  key: string;
  filename: string;
  filepath: string;
  size: number;
  directory: boolean;
  urls: string[];
}

export interface OpenNeuroPluginProps {
  width?: number;
  height?: number;
  file: OpenNeuroFile;
  onNavigate?: (path: string) => void;
}

export interface OpenNeuroPlugin {
  name: string;
  type: string[]; // File extensions this plugin handles
  component: FunctionComponent<OpenNeuroPluginProps>;
  priority?: number;
}

export interface OpenNeuroPluginData {
  type: "file";
  content: string;
  metadata?: Record<string, unknown>;
}

// Helper function to check if a plugin supports a file type
export const pluginSupportsFile = (
  plugin: OpenNeuroPlugin,
  filename: string,
): boolean => {
  return plugin.type.some((ext) =>
    filename.toLowerCase().endsWith(ext.toLowerCase()),
  );
};
