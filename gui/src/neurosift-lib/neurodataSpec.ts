import { NwbFileSpecifications } from "./misc/SpecificationsView/SetupNwbFileSpecificationsProvider";

const neurodataTypeInheritanceRaw: { [key: string]: string } = {
  NWBData: "Data",
  Image: "NWBData",
  NWBContainer: "Container",
  NWBDataInterface: "NWBContainer",
  TimeSeries: "NWBDataInterface",
  ProcessingModule: "NWBContainer",
  Images: "NWBDataInterface",
  SpatialSeries: "TimeSeries",
  BehavioralEpochs: "NWBDataInterface",
  BehavioralEvents: "NWBDataInterface",
  BehavioralTimeSeries: "NWBDataInterface",
  PupilTracking: "NWBDataInterface",
  EyeTracking: "NWBDataInterface",
  CompassDirection: "NWBDataInterface",
  Position: "NWBDataInterface",
  Device: "NWBContainer",
  ElectricalSeries: "TimeSeries",
  SpikeEventSeries: "ElectricalSeries",
  FeatureExtraction: "NWBDataInterface",
  EventDetection: "NWBDataInterface",
  EventWaveform: "NWBDataInterface",
  FilteredEphys: "NWBDataInterface",
  LFP: "NWBDataInterface",
  ElectrodeGroup: "NWBContainer",
  ClusterWaveforms: "NWBDataInterface",
  Clustering: "NWBDataInterface",
  TimeIntervals: "DynamicTable",
  ScratchData: "NWBData",
  NWBFile: "NWBContainer",
  LabMetaData: "NWBContainer",
  Subject: "NWBContainer",
  PatchClampSeries: "TimeSeries",
  CurrentClampSeries: "PatchClampSeries",
  IZeroClampSeries: "CurrentClampSeries",
  CurrentClampStimulusSeries: "PatchClampSeries",
  VoltageClampSeries: "PatchClampSeries",
  VoltageClampStimulusSeries: "PatchClampSeries",
  IntracellularElectrode: "NWBContainer",
  SweepTable: "DynamicTable",
  GrayscaleImage: "Image",
  RGBImage: "Image",
  RGBAImage: "Image",
  ImageSeries: "TimeSeries",
  ImageMaskSeries: "ImageSeries",
  OpticalSeries: "ImageSeries",
  IndexSeries: "TimeSeries",
  AbstractFeatureSeries: "TimeSeries",
  AnnotationSeries: "TimeSeries",
  IntervalSeries: "TimeSeries",
  DecompositionSeries: "TimeSeries",
  Units: "DynamicTable",
  OptogeneticSeries: "TimeSeries",
  OptogeneticStimulusSite: "NWBContainer",
  OnePhotonSeries: "ImageSeries",
  TwoPhotonSeries: "ImageSeries",
  MicroscopySeries: "ImageSeries",
  VariableDepthMicroscopySeries: "ImageSeries",
  RoiResponseSeries: "TimeSeries",
  MicroscopyRoiResponseSeries: "TimeSeries",
  DfOverF: "NWBDataInterface",
  Fluorescence: "NWBDataInterface",
  MicroscopyResponseSeriesContainer: "NWBDataInterface",
  ImageSegmentation: "NWBDataInterface",
  MicroscopySegmentations: "NWBDataInterface",
  PlaneSegmentation: "DynamicTable",
  ImagingPlane: "NWBContainer",
  OpticalChannel: "NWBContainer",
  MotionCorrection: "NWBDataInterface",
  CorrectedImageStack: "NWBDataInterface",
  ImagingRetinotopy: "NWBDataInterface",
  AnnotatedEventsTable: "Units", // added manually. See https://github.com/flatironinstitute/neurosift/issues/89
  FiberPhotometryResponseSeries: "TimeSeries", // added manually
};

// export const neurodataTypeInheritance: { [key: string]: string[] } = {}
// for (const key in neurodataTypeInheritanceRaw) {
//     neurodataTypeInheritance[key] = []
//     let val = neurodataTypeInheritanceRaw[key]
//     // eslint-disable-next-line no-constant-condition
//     while (true) {
//         neurodataTypeInheritance[key].push(val)
//         if (val in neurodataTypeInheritanceRaw) {
//             val = neurodataTypeInheritanceRaw[val]
//         } else {
//             break
//         }
//     }
// }

export const getNeurodataTypeInheritanceRaw = (
  specifications: NwbFileSpecifications,
) => {
  const inheritanceRaw = JSON.parse(
    JSON.stringify(neurodataTypeInheritanceRaw),
  );
  for (const x of specifications.allGroups) {
    const def = x.neurodata_type_def;
    const inc = x.neurodata_type_inc;
    if (inc) {
      inheritanceRaw[def] = inc;
    }
  }
  for (const x of specifications.allDatasets) {
    const def = x.neurodata_type_def;
    const inc = x.neurodata_type_inc;
    if (inc) {
      inheritanceRaw[def] = inc;
    }
  }
  return inheritanceRaw;
};

export const neurodataTypeInheritsFrom = (
  type: string | undefined,
  baseType: string,
  specifications: NwbFileSpecifications | undefined,
) => {
  if (!type) return false;
  if (type === baseType) return true;
  if (!specifications) return false;
  const inheritanceRaw = getNeurodataTypeInheritanceRaw(specifications);
  const inheritance: { [key: string]: string[] } = {};
  for (const key in inheritanceRaw) {
    inheritance[key] = [];
    let val = inheritanceRaw[key];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      inheritance[key].push(val);
      if (val in inheritanceRaw) {
        val = inheritanceRaw[val];
      } else {
        break;
      }
    }
  }
  return inheritance[type]?.includes(baseType);
};

export const neurodataTypeParentType = (type: string) => {
  const parent = neurodataTypeInheritanceRaw[type];
  if (!parent) return undefined;
  return parent;
};
