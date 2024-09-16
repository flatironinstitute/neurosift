# Neurosift Plugins for Neurodata Types

The goal is to eventually support all data types with plugins.

|Neurodata Type|Parent Type|Neurosift Plugin|Example|
|--------------|-----------|----------------|-------|
|AbstractFeatureSeries|TimeSeries|From TimeSeries||
|AnnotatedEventsTable|Units|From Units||
|AnnotationSeries|TimeSeries|From TimeSeries||
|BehavioralEpochs|NWBDataInterface|||
|BehavioralEvents|NWBDataInterface|BehavioralEvents|[example](https://neurosift.app/?p=/nwb&dandisetId=000629&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/efe22650-8f8b-48ac-85c8-2d5a42c00744/download/&tab=neurodata-item:/processing/behavior/behavioral_events\|BehavioralEvents)|
|BehavioralTimeSeries|NWBDataInterface|||
|Clustering|NWBDataInterface|||
|ClusterWaveforms|NWBDataInterface|||
|CompassDirection|NWBDataInterface|||
|CorrectedImageStack|NWBDataInterface|||
|CurrentClampSeries|PatchClampSeries|||
|CurrentClampStimulusSeries|PatchClampSeries|||
|DecompositionSeries|TimeSeries|From TimeSeries||
|Device|NWBContainer|||
|DfOverF|NWBDataInterface|||
|ElectricalSeries|TimeSeries|ElectricalSeries|[example](https://neurosift.app/?p=/nwb&dandisetId=000947&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/766438c5-fa8c-42a5-bd26-41c8a89be93a/download/&tab=neurodata-item:/acquisition/ElectricalSeries\|ElectricalSeries)|
|ElectrodeGroup|NWBContainer|||
|EventDetection|NWBDataInterface|||
|EventWaveform|NWBDataInterface|||
|EyeTracking|NWBDataInterface|||
|FeatureExtraction|NWBDataInterface|||
|FilteredEphys|NWBDataInterface|||
|Fluorescence|NWBDataInterface|||
|GrayscaleImage|Image|||
|Image|NWBData|||
|ImageMaskSeries|ImageSeries|From ImageSeries||
|Images|NWBDataInterface|Images|[example](https://neurosift.app/?p=/nwb&dandisetId=000957&dandisetVersion=0.240407.0142&url=https://api.dandiarchive.org/api/assets/ce047d88-95b3-4169-a63b-e30a4f35d86e/download/&tab=neurodata-item:/stimulus/templates/template_118_images\|Images)|
|ImageSegmentation|NWBDataInterface|ImageSegmentation|[example](https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/368/fa7/368fa71e-4c93-4f7e-af15-06776ca07f34&tab=neurodata-item:/processing/ophys/ImageSegmentation%7CImageSegmentation)|
|ImageSeries|TimeSeries|||
|ImagingPlane|NWBContainer|||
|ImagingRetinotopy|NWBDataInterface|||
|IndexSeries|TimeSeries|From TimeSeries|[example](http://localhost:4200/?p=/nwb&dandisetId=000957&dandisetVersion=0.240407.0142&url=https://api.dandiarchive.org/api/assets/d4bd92fc-4119-4393-b807-f007a86778a1/download/&tab=neurodata-item:/stimulus/presentation/pre_motion_stim_index\|IndexSeries)|
|IntervalSeries|TimeSeries|From TimeSeries||
|IntracellularElectrode|NWBContainer|||
|IZeroClampSeries|CurrentClampSeries|||
|LabMetaData|NWBContainer|||
|LFP|NWBDataInterface|||
|LabeledEvents||||
|MotionCorrection|NWBDataInterface|||
|NWBContainer|Container|||
|NWBData|Data|||
|NWBDataInterface|NWBContainer|||
|NWBFile|NWBContainer|||
|OnePhotonSeries|ImageSeries|OnePhotonSeries|[example](https://neurosift.app/?p=/nwb&dandisetId=000935&dandisetVersion=0.240319.2026&url=https://api.dandiarchive.org/api/assets/6b9ac40b-4a63-4406-a03f-99f649d9fabe/download/&tab=neurodata-item:/acquisition/1pInternal\|OnePhotonSeries)|
|OpticalChannel|NWBContainer|||
|OpticalSeries|ImageSeries|||
|OptogeneticSeries|TimeSeries|From TimeSeries||
|OptogeneticStimulusSite|NWBContainer|||
|PatchClampSeries|TimeSeries|From TimeSeries||
|PlaneSegmentation|DynamicTable|From DynamicTable||
|Position|NWBDataInterface|||
|ProcessingModule|NWBContainer|||
|PupilTracking|NWBDataInterface|||
|RGBAImage|Image|||
|RGBImage|Image|||
|RoiResponseSeries|TimeSeries|From TimeSeries||
|ScratchData|NWBData|||
|SpatialSeries|TimeSeries|SpatialSeries and SpatialSeriesXYView|[example](https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/c86/cdf/c86cdfba-e1af-45a7-8dfd-d243adc20ced&tab=neurodata-items:neurodata-item:/acquisition/position_sensor0%7CSpatialSeries@view:X/Y%7C/acquisition/position_sensor0&tab-time=0,384,117.50619637750238)|
|SpikeEventSeries|ElectricalSeries|From ElectricalSeries||
|Subject|NWBContainer|||
|SweepTable|DynamicTable|From DynamicTable||
|TimeIntervals|DynamicTable|TimeIntervals, PSTH, TrialAlignedSeries|[time-intervals-example](https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/cae/e8f/caee8f64-ebeb-439d-a3f4-e3380699b49f&tab=neurodata-item:/intervals/trials%7CTimeIntervals), [psth-example](https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/df3/e3f/df3e3f73-50ab-42b4-8827-82664ddd474a&tab=view:PSTH%7C/intervals/trials)|
|TimeSeries|NWBDataInterface|TimeSeries|[example](https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/c86/cdf/c86cdfba-e1af-45a7-8dfd-d243adc20ced&tab=neurodata-item:/acquisition/ch_SsolL%7CTimeSeries&tab-time=43.82871078730636,95.27484222730642,72.51887941685835)|
|ImageSeries|OnePhotonSeries|TwoPhotonSeries|VariableDepthMicroscopySeries|[two-photon-example](https://neurosift.app/?p=/nwb&dandisetId=000951&dandisetVersion=0.240418.2218&url=https://api.dandiarchive.org/api/assets/7f4fbb15-ff41-4eb9-b556-39000f259dcf/download/&tab=neurodata-item:/acquisition/TwoPhotonSeries\|TwoPhotonSeries), [variable-depth-microscopy-example](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/de6c2b2b-9ac0-4819-8119-9655c5a7eeea/download/&dandisetId=001075&dandisetVersion=draft&tab=neurodata-item:/acquisition/PumpProbeImagingGreen|VariableDepthMicroscopySeries)
|Units|DynamicTable|Units, RasterPlot, AverageWaveforms, Autocorrelograms|[raster-plot-example](https://neurosift.app/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/a63/6de/a636de8b-7c90-4a41-94be-9da3de53cf82&tab=view:DirectRasterPlot\|/units), [average-waveforms-example](https://neurosift.app/?p=/nwb&url=https://neurosift.org/dendro-outputs/d02200fd.e19adcf8/output&dandisetId=000939&dandisetVersion=0.240327.2229&dandiAssetId=56d875d6-a705-48d3-944c-53394a389c85&st=lindi&tab=view:AverageWaveforms\|/units), [autocorrelograms-example](https://neurosift.app/?p=/nwb&url=https://neurosift.org/dendro-outputs/d02200fd.e19adcf8/output&dandisetId=000939&dandisetVersion=0.240327.2229&dandiAssetId=56d875d6-a705-48d3-944c-53394a389c85&st=lindi&tab=view:Autocorrelograms\|/units)|
|VoltageClampSeries|PatchClampSeries|||
|VoltageClampStimulusSeries|PatchClampSeries|||
