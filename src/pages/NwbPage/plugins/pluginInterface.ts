export interface NwbObjectViewPlugin {
  name: string;
  label?: string; // otherwise same as name
  // Returns whether this plugin can handle the given nwb group
  canHandle: (o: {
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
    secondaryPaths?: string[];
  }) => Promise<boolean>;
  // Component to render the view
  component: React.ComponentType<{
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
    onOpenObjectInNewTab?: (path: string) => void;
    secondaryPaths?: string[];
    width?: number;
    height?: number;
    condensed?: boolean;
  }>;
  special?: boolean;
  requiresWindowDimensions?: boolean;
  showInMultiView?: boolean;
  requiredDefaultUnits?: boolean;
}
