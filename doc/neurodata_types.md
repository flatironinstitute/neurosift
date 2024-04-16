# Neurosift Plugins for Neurodata Types

|Neurodata Type|Parent Type|Neurosift Plugin|
|--------------|-----------|----------------|
|AbstractFeatureSeries|TimeSeries|From TimeSeries|
|AnnotatedEventsTable|Units||
|AnnotationSeries|TimeSeries|From TimeSeries|
|BehavioralEpochs|NWBDataInterface||
|BehavioralEvents|NWBDataInterface|BehavioralEvents|
|BehavioralTimeSeries|NWBDataInterface||
|Clustering|NWBDataInterface||
|ClusterWaveforms|NWBDataInterface||
|CompassDirection|NWBDataInterface||
|CorrectedImageStack|NWBDataInterface||
|CurrentClampSeries|PatchClampSeries||
|CurrentClampStimulusSeries|PatchClampSeries||
|DecompositionSeries|TimeSeries|From TimeSeries|
|Device|NWBContainer||
|DfOverF|NWBDataInterface||
|ElectricalSeries|TimeSeries|ElectricalSeries|
|ElectrodeGroup|NWBContainer||
|EventDetection|NWBDataInterface||
|EventWaveform|NWBDataInterface||
|EyeTracking|NWBDataInterface||
|FeatureExtraction|NWBDataInterface||
|FilteredEphys|NWBDataInterface||
|Fluorescence|NWBDataInterface||
|GrayscaleImage|Image||
|Image|NWBData||
|ImageMaskSeries|ImageSeries|From ImageSeries|
|Images|NWBDataInterface|Images|
|ImageSegmentation|NWBDataInterface|ImageSegmentation|
|ImageSeries|TimeSeries|ImageSeries|
|ImagingPlane|NWBContainer||
|ImagingRetinotopy|NWBDataInterface||
|IndexSeries|TimeSeries|From TimeSeries|
|IntervalSeries|TimeSeries|From TimeSeries|
|IntracellularElectrode|NWBContainer||
|IZeroClampSeries|CurrentClampSeries||
|LabMetaData|NWBContainer||
|LFP|NWBDataInterface||
|LabeledEvents||LabeledEvents|
|MotionCorrection|NWBDataInterface||
|NWBContainer|Container||
|NWBData|Data||
|NWBDataInterface|NWBContainer||
|NWBFile|NWBContainer||
|OnePhotonSeries|ImageSeries|OnePhotonSeries|
|OpticalChannel|NWBContainer||
|OpticalSeries|ImageSeries||
|OptogeneticSeries|TimeSeries|From TimeSeries|
|OptogeneticStimulusSite|NWBContainer||
|PatchClampSeries|TimeSeries|From TimeSeries|
|PlaneSegmentation|DynamicTable|From DynamicTable|
|Position|NWBDataInterface||
|ProcessingModule|NWBContainer||
|PupilTracking|NWBDataInterface||
|RGBAImage|Image||
|RGBImage|Image||
|RoiResponseSeries|TimeSeries|From TimeSeries|
|ScratchData|NWBData||
|SpatialSeries|TimeSeries|SpatialSeries and SpatialSeriesXYView|
|SpikeEventSeries|ElectricalSeries|From ElectricalSeries|
|Subject|NWBContainer||
|SweepTable|DynamicTable|From DynamicTable|
|TimeIntervals|DynamicTable|TimeIntervals, PSTH, TimeAlignedSeries|
|TimeSeries|NWBDataInterface|TimeSeries|
|TwoPhotonSeries|ImageSeries|TwoPhotonSeries|
|Units|DynamicTable|Units, RasterPlot, AverageWaveforms, Autocorrelograms|
|VoltageClampSeries|PatchClampSeries||
|VoltageClampStimulusSeries|PatchClampSeries||