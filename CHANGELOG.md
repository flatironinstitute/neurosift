# Changes

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
