import { FunctionComponent } from "react";

export interface OpenNeuroFile {
  id: string;
  key: string;
  filename: string;
  filepath: string;
  parentId: string;
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
  type: string[]; // Glob patterns this plugin handles (e.g. "*.tsv", "CHANGES", "dataset_description.json")
  component: FunctionComponent<OpenNeuroPluginProps>;
  priority?: number;
}

export interface OpenNeuroPluginData {
  type: "file";
  content: string;
  metadata?: Record<string, unknown>;
}

const isGlobMatch = (pattern: string, filename: string): boolean => {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[-/^$+?.()|{}]/g, "\\$&") // Escape regex special characters except * and ?
    .replace(/\*/g, ".*") // Convert * to .*
    .replace(/\?/g, "."); // Convert ? to .

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filename);
};

// Helper function to check if a plugin supports a file type
export const pluginSupportsFile = (
  plugin: OpenNeuroPlugin,
  filename: string,
): boolean => {
  return plugin.type.some((pattern) => isGlobMatch(pattern, filename));
};
