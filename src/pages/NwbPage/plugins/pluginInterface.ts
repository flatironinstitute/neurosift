export interface NwbObjectViewPlugin {
  name: string;
  // Returns whether this plugin can handle the given nwb group
  canHandle: (o: {
    nwbUrl: string;
    path: string;
    secondaryPaths?: string[];
  }) => Promise<boolean>;
  // Component to render the view
  component: React.ComponentType<{
    nwbUrl: string;
    path: string;
    onOpenObjectInNewTab?: (path: string) => void;
    secondaryPaths?: string[];
    width?: number;
    height?: number;
  }>;
  special?: boolean;
  requiresWindowDimensions?: boolean;
}
