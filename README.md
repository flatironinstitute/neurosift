# neurosift (v2)

Neurosift is a browser-based tool designed for the visualization of neuroscience data with a focus on NWB (Neurodata Without Borders) filesy, and enables interactive exploration of the [DANDI Archive](https://dandiarchive.org/) and [OpenNeuro](https://openneuro.org/) online repositories.

This branch contains the new (v2) version of neurosift. The previous (v1) version is available on the [main branch](https://github.com/flatironinstitute/neurosift/tree/main).

The live application is hosted at [https://neurosift.app](https://neurosift.app).

## For developers

Follow these steps to install and run the app locally in development mode:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd neurosift
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The development server typically runs on [http://localhost:5173](http://localhost:5173).

## Contributions

Pull requests are welcomed. If you have suggestions, improvements, or bug fixes, please feel free to open a pull request.

### Code Formatting

This project uses pre-commit hooks to automatically check format code before each commit. The formatting includes:
- Python code formatting using black
- TypeScript/JavaScript code formatting using npm scripts

To set up the pre-commit hooks after cloning the repository:

1. Install pre-commit:
```bash
pip install pre-commit
```

2. Install the git hook scripts:
```bash
pre-commit install
```

After this setup, code will be automatically checked for formatting when you make a commit.

Running `./devel/format_code.sh` which will format all code in the repository.

## Example Views

The following table provides example visualizations of different neurodata types through Neurosift:

| Neurodata Type | Name | Dandiset ID | Example Link |
|----------------|------|-------------|----------|
| Image | maximum_intensity_projection | 000728 | [View](http://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/f02db27e-82eb-41dd-865a-a08bb41491da/download/&dandisetId=000728&dandisetVersion=0.240827.1809&tab=/processing/ophys/SummaryImages/maximum_intensity_projection) |
| Images | StimulusPresentation/indexed_images | 000673 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/&dandisetId=000673&dandisetVersion=0.250122.0110&tab=/stimulus/presentation/StimulusPresentation/indexed_images) |
| Units | units | 000409 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/&dandisetId=000409&dandisetVersion=draft&tab=/units) |
| ElectricalSeries | neurodata_type: ElectricalSeries | 000409 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/&dandisetId=000409&dandisetVersion=draft&tab=/acquisition/ElectricalSeriesAp) |
| TimeIntervals / Units / PSTH | /intervals/trials | 000409 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/&dandisetId=000409&dandisetVersion=draft&tab=view:PSTH%7C/intervals/trials^/units) |
| SpatialSeries | pupil_location_spherical | 000728 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/a081de4c-ba98-4ba1-b828-9a8b0eeaccfd/download/&dandisetId=000728&dandisetVersion=0.240827.1809&tab=/processing/behavior/CompassDirection/pupil_location_spherical) |
| LabeledEvents | RewardEventsLinearTrack | 000568 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/72bebc59-e73e-4d6b-b4ab-086d054583d6/download/&dandisetId=000568&dandisetVersion=0.230705.1633&tab=/processing/behavior/RewardEventsLinearTrack) |
| ImageSegmentation | ophys/ImageSegmentation | - | [View](https://neurosift.app/nwb?url=https://dandiarchive.s3.amazonaws.com/blobs/368/fa7/368fa71e-4c93-4f7e-af15-06776ca07f34&tab=/processing/ophys/ImageSegmentation) |
| TwoPhotonSeries | raw_suite2p_motion_corrected | 000871 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/89256db6-8926-451f-b51f-8a7ae7c3c1f8/download/&dandisetId=000871&dandisetVersion=draft&tab=/acquisition/raw_suite2p_motion_corrected) |
| TimeIntervals | /intervals/epochs | 000954 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/dd1bdcf3-5430-4037-ad4a-1727004d38d2/download/&dandisetId=000954&dandisetVersion=draft&tab=/intervals/epochs) |
| TimeIntervals / FiberPhotometryResponseSeries / TrialAlignedSeries | DfOverFFiberPhotometryResponseSeries | 001084 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/bca70a25-e5a5-4a40-b36f-fe1088b85eb2/download/&dandisetId=001084&dandisetVersion=draft&tab=view:TrialAlignedSeries%7C/processing/behavior/TimeIntervals^/processing/ophys/DfOverFFiberPhotometryResponseSeriesGreenIsosbestic) |
| BehavioralEvents | behavioral_events | 000115 | [View](https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/6df57370-9de8-4514-82f3-65d0f0528cde/download/&dandisetId=000115&dandisetVersion=0.210914.1732&tab=/processing/behavior/behavioral_events) |

## License

This project is licensed under the Apache 2.0 License.
