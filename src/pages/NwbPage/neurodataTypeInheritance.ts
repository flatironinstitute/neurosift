import {
  NwbFileSpecifications,
  SpecificationsDataset,
  SpecificationsGroup,
} from "./SpecificationsView/SetupNwbFileSpecificationsProvider";

// Fallback parent relationships for types from the NWB core schema and common
// extensions. Used when the file's embedded specifications are unavailable or
// have not loaded yet. Relationships derived from the file's own specifications
// take precedence over these.
const fallbackParentMap: { [type: string]: string } = {
  // static images
  GrayscaleImage: "Image",
  RGBImage: "Image",
  RGBAImage: "Image",
  // timeseries
  ImageSeries: "TimeSeries",
  ImageMaskSeries: "ImageSeries",
  OpticalSeries: "ImageSeries",
  TwoPhotonSeries: "ImageSeries",
  OnePhotonSeries: "ImageSeries",
  IndexSeries: "TimeSeries",
  IntervalSeries: "TimeSeries",
  SpatialSeries: "TimeSeries",
  ElectricalSeries: "TimeSeries",
  SpikeEventSeries: "ElectricalSeries",
  AnnotationSeries: "TimeSeries",
  AbstractFeatureSeries: "TimeSeries",
  DecompositionSeries: "TimeSeries",
  OptogeneticSeries: "TimeSeries",
  RoiResponseSeries: "TimeSeries",
  PatchClampSeries: "TimeSeries",
  CurrentClampSeries: "PatchClampSeries",
  IZeroClampSeries: "CurrentClampSeries",
  CurrentClampStimulusSeries: "PatchClampSeries",
  VoltageClampSeries: "PatchClampSeries",
  VoltageClampStimulusSeries: "PatchClampSeries",
  // dynamic tables
  TimeIntervals: "DynamicTable",
  Units: "DynamicTable",
  PlaneSegmentation: "DynamicTable",
  ElectrodesTable: "DynamicTable",
  // common extensions
  LabeledEvents: "Events", // ndx-events
  PoseEstimationSeries: "SpatialSeries", // ndx-pose
  FiberPhotometryResponseSeries: "TimeSeries", // ndx-fiber-photometry
  OptogeneticPulsesTable: "TimeIntervals", // ndx-optogenetics
};

const parentMapCache = new WeakMap<
  NwbFileSpecifications,
  { [type: string]: string }
>();

// Build a map from neurodata_type_def to neurodata_type_inc, combining the
// fallback relationships above with the file's embedded specifications (which
// take precedence and include any extension schemas written into the file).
export const getNeurodataTypeParentMap = (
  specifications?: NwbFileSpecifications,
): { [type: string]: string } => {
  if (!specifications) return fallbackParentMap;
  const cached = parentMapCache.get(specifications);
  if (cached) return cached;
  const map: { [type: string]: string } = { ...fallbackParentMap };
  const addEntries = (
    items: (SpecificationsGroup | SpecificationsDataset)[],
  ) => {
    for (const item of items) {
      if (item.neurodata_type_def && item.neurodata_type_inc) {
        map[item.neurodata_type_def] = item.neurodata_type_inc;
      }
    }
  };
  addEntries(specifications.allGroups);
  addEntries(specifications.allDatasets);
  parentMapCache.set(specifications, map);
  return map;
};

// Return the inheritance chain for a type, starting with the type itself,
// e.g. ["TwoPhotonSeries", "ImageSeries", "TimeSeries"].
export const getNeurodataTypeAncestry = (
  neurodataType: string | undefined,
  specifications?: NwbFileSpecifications,
): string[] => {
  if (!neurodataType) return [];
  const parentMap = getNeurodataTypeParentMap(specifications);
  const chain: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = neurodataType;
  while (current && !visited.has(current)) {
    chain.push(current);
    visited.add(current);
    current = parentMap[current];
  }
  return chain;
};

// Whether neurodataType is baseType or a subtype of baseType, according to the
// file's specifications (with fallback to known core/extension relationships).
export const neurodataTypeInheritsFrom = (
  neurodataType: string | undefined,
  baseType: string,
  specifications?: NwbFileSpecifications,
): boolean => {
  if (!neurodataType) return false;
  return getNeurodataTypeAncestry(neurodataType, specifications).includes(
    baseType,
  );
};

export const neurodataTypeInheritsFromAny = (
  neurodataType: string | undefined,
  baseTypes: string[],
  specifications?: NwbFileSpecifications,
): boolean => {
  if (!neurodataType) return false;
  const ancestry = getNeurodataTypeAncestry(neurodataType, specifications);
  return baseTypes.some((b) => ancestry.includes(b));
};
