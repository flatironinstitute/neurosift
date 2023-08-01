export const neurodataTypeInheritanceRaw: { [key: string]: string } = {
    "NWBData": "Data",
    "Image": "NWBData",
    "NWBContainer": "Container",
    "NWBDataInterface": "NWBContainer",
    "TimeSeries": "NWBDataInterface",
    "ProcessingModule": "NWBContainer",
    "Images": "NWBDataInterface",
    "SpatialSeries": "TimeSeries",
    "BehavioralEpochs": "NWBDataInterface",
    "BehavioralEvents": "NWBDataInterface",
    "BehavioralTimeSeries": "NWBDataInterface",
    "PupilTracking": "NWBDataInterface",
    "EyeTracking": "NWBDataInterface",
    "CompassDirection": "NWBDataInterface",
    "Position": "NWBDataInterface",
    "Device": "NWBContainer",
    "ElectricalSeries": "TimeSeries",
    "SpikeEventSeries": "ElectricalSeries",
    "FeatureExtraction": "NWBDataInterface",
    "EventDetection": "NWBDataInterface",
    "EventWaveform": "NWBDataInterface",
    "FilteredEphys": "NWBDataInterface",
    "LFP": "NWBDataInterface",
    "ElectrodeGroup": "NWBContainer",
    "ClusterWaveforms": "NWBDataInterface",
    "Clustering": "NWBDataInterface",
    "TimeIntervals": "DynamicTable",
    "ScratchData": "NWBData",
    "NWBFile": "NWBContainer",
    "LabMetaData": "NWBContainer",
    "Subject": "NWBContainer",
    "PatchClampSeries": "TimeSeries",
    "CurrentClampSeries": "PatchClampSeries",
    "IZeroClampSeries": "CurrentClampSeries",
    "CurrentClampStimulusSeries": "PatchClampSeries",
    "VoltageClampSeries": "PatchClampSeries",
    "VoltageClampStimulusSeries": "PatchClampSeries",
    "IntracellularElectrode": "NWBContainer",
    "SweepTable": "DynamicTable",
    "GrayscaleImage": "Image",
    "RGBImage": "Image",
    "RGBAImage": "Image",
    "ImageSeries": "TimeSeries",
    "ImageMaskSeries": "ImageSeries",
    "OpticalSeries": "ImageSeries",
    "IndexSeries": "TimeSeries",
    "AbstractFeatureSeries": "TimeSeries",
    "AnnotationSeries": "TimeSeries",
    "IntervalSeries": "TimeSeries",
    "DecompositionSeries": "TimeSeries",
    "Units": "DynamicTable",
    "OptogeneticSeries": "TimeSeries",
    "OptogeneticStimulusSite": "NWBContainer",
    "TwoPhotonSeries": "ImageSeries",
    "RoiResponseSeries": "TimeSeries",
    "DfOverF": "NWBDataInterface",
    "Fluorescence": "NWBDataInterface",
    "ImageSegmentation": "NWBDataInterface",
    "PlaneSegmentation": "DynamicTable",
    "ImagingPlane": "NWBContainer",
    "OpticalChannel": "NWBContainer",
    "MotionCorrection": "NWBDataInterface",
    "CorrectedImageStack": "NWBDataInterface",
    "ImagingRetinotopy": "NWBDataInterface",
    "AnnotatedEventsTable": "Units" // added manually. See https://github.com/flatironinstitute/neurosift/issues/89
}

export const neurodataTypeInheritance: { [key: string]: string[] } = {}
for (const key in neurodataTypeInheritanceRaw) {
    neurodataTypeInheritance[key] = []
    let val = neurodataTypeInheritanceRaw[key]
    // eslint-disable-next-line no-constant-condition
    while (true) {
        neurodataTypeInheritance[key].push(val)
        if (val in neurodataTypeInheritanceRaw) {
            val = neurodataTypeInheritanceRaw[val]
        } else {
            break
        }
    }
}

export const neurodataTypeInheritsFrom = (type: string | undefined, baseType: string) => {
    if (!type) return false
    if (type === baseType) return true
    return neurodataTypeInheritance[type]?.includes(baseType)
}

export const neurodataTypeParentType = (type: string) => {
    const parent = neurodataTypeInheritanceRaw[type]
    if (!parent) return undefined
    return parent
}