# Changes

## March 13, 2026

- Show dataset chunking and compression in HDF5 view

## March 9, 2026

- Add LINDI LocalCache to generated Python scripts

## January 27, 2026

- Update NIfTI warning statement for files larger than 100 MB
- Standardize `NIFTI` naming to `NIfTI`

## November 24, 2025

- Added combined time controller for SpatialSeries view with editable duration/start time fields, zoom/pan buttons, and graphical time bar on a single horizontal line

## November 15, 2025

- Began implementation of /slp route for displaying SLEAP files

## November 14, 2025

- Support Figpack Pose Estimation generation and visualization

## November 13, 2025

- Added clickable links in Figpack job status displays that open runpack-admin pages in new browser tabs
- Implemented VideoViewer component for /video route with DANDI API authentication and S3 signed URL resolution

## November 12, 2025

- Added TimeIntervals support to Timeseries Alignment widget with single bar visualization
- Added NaN-aware time calculations for TimeIntervals (filters invalid values, uses max start time when stop times are NaN)
- Implemented Figpack Raster Plot visualization using Runpack worker API for distributed job processing
- Added useRunpackJob hook for managing Runpack API interactions with job submission, status checking, and result retrieval
- FigpackRasterPlotView now supports generating and displaying figpack raster plots in an iframe with job status tracking
- Added Figpack video preview plugin

## November 6, 2025

- Updated GitHub workflow to deploy to Cloudflare Pages instead of Vercel
- Remove "Notebook" panel in NWB main tab

## November 5, 2025

- Added neurosift-logs Cloudflare Worker for receiving and logging HTTP requests with CORS support
- Added client-side page load logging with rate limiting (logs sent to Cloudflare Worker)

## November 4, 2025

- Migrate to Cloudflare

## November 3, 2025

- Updated DANDI API endpoint from api-staging.dandiarchive.org to api.sandbox.dandiarchive.org

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
