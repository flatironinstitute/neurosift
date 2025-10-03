# Changes

## October 3, 2025

- Support OptogeneticPulsesTable as a TimeIntervals type in addition to TimeIntervals. See https://github.com/flatironinstitute/neurosift/issues/355
- Fixed TimeIntervals visualization to use all distinct labels from the full dataset, ensuring consistent colors and positioning across different time ranges

## October 1, 2025

- Simplified DANDI semantic search implementation to use direct API call instead of job runner
- Fixed semantic search to display user-friendly error messages when API quota limits are exceeded, instead of silently showing empty results

## September 4, 2025

- Added script in index.html to automatically redirect from `/dandiset/` to `/ember-dandiset/` when referrer parameter contains 'ember' and always remove referrer parameter from URL

## August 19, 2025

- implemented neurosift-search service (nextjs)

## August 13, 2025

- Added job cancellation functionality to JobStatusHandler component with red "Cancel Job" button for running jobs
- Added continuous integration workflow to test neurosift Python package installation, NWB file creation with pynwb, and CLI functionality

## August 11, 2025

- Added redirect from /experimental-neurotile to /experimental-neurosift-tiles for URL compatibility
- Modified ExperimentalNeurosiftTilesPage to use zarr_url and path query parameters instead of example parameter, with examples landing page when parameters are not provided
- Modified ExperimentalNeurosiftTilesPage to dynamically fetch examples from neurosift-tiles catalog instead of hard-coding them

## August 1, 2025

- Added channel selection functionality to neurotile visualization with click-to-select interaction
- Implemented semitransparent yellow highlight overlay for selected channels in neurotile view
- Added mouse click handling in TimeScrollView3 to support channel selection based on Y-coordinate
- Enhanced neurotile rendering to display selected channel indicator with both fill and border highlighting

See [CHANGELOG_through_July_2025](./CHANGELOG_through_July_2025.md)
