import { NwbFileSpecifications } from "../SpecificationsView/SetupNwbFileSpecificationsProvider";
import type { NeurodataObject } from "../useNeurodataObjects";

export interface NwbObjectViewPlugin {
  name: string;
  label?: string; // otherwise same as name
  // Returns whether this plugin can handle the given nwb group
  canHandle: (o: {
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
    secondaryPaths?: string[];
    specifications?: NwbFileSpecifications;
  }) => Promise<boolean>;
  // Optionally derive candidate secondary object paths for a "launch from
  // table" button from the full list of neurodata objects in the file. Returns
  // one entry per launchable pairing (each a secondaryPaths array). This is for
  // plugins whose secondary object cannot be inferred from the primary object
  // alone (e.g. aligning a TimeSeries against a TimeIntervals table), so a
  // button should appear only when a compatible partner exists. Each returned
  // pairing is still validated with canHandle before a button is shown.
  getLaunchSecondaryPaths?: (o: {
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
    neurodataObjects: NeurodataObject[];
  }) => string[][] | Promise<string[][]>;
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
  launchableFromTable?: boolean;
  requiresWindowDimensions?: boolean;
  showInMultiView?: boolean;
  hideFromObjectView?: boolean;
  requiredDefaultUnits?: boolean;
}
