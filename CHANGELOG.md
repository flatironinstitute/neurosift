# Changes

## June 19, 2025
- Added toggle legend button for plotly timeseries plots (Issue #328)
- Fixed margin difference between plotly and native NS plots by removing width reduction and right margin (Issue #330)

## June 17, 2025
- Added GitHub link to application toolbar that opens the issues page for easy bug reporting

## June 12, 2025
- Optimized experimental search panel to eliminate repeated script executions by implementing client-side filtering
- Added dandiset counts next to contact person names in experimental search panel
- Added dandi-index and implemented advanced search
- Added .env.local template for configuring PubNub keys in local development

## June 5, 2025
- Modernized Python package structure with pyproject.toml configuration. Removed legacy setup.py, setup.cfg, and setup.cfg.j2 files
- Added option for using local neurosift server with the CLI

## May 20, 2025
- Added support for resolving NWB file URLs from dandiset path in NwbPage

## May 12, 2025
- Improved error message formatting for large datasets to display sizes in human-readable form (Issue #187)
- Added permission error notification for embargoed DANDI datasets (Issue #297)
  - Added error detection for unauthorized access attempts
  - Added UI notification with guidance on how to provide API key credentials
  - Added direct links to settings page and DANDI archive for obtaining API keys

## April 13, 2025
- Added direct editing of time window values in timeseries visualizations (Issue #303). Users can now click on the duration and start time values to edit them directly. Press ESC to exit
- Fixed TimeIntervals widget to properly render when no categorical columns are available (Issue #302)

## April 4, 2025
- Fixed handling of '+' characters in URL parameters for NWB file viewing

## April 1, 2025
- Improve Dandi notebook access for Dandiset

## March 19, 2025
- Reduced spacing between plots in the dashboard for a tighter, more compact layout

## March 14, 2025
- Added Notebook section in NwbPage that displays nbfiddle.org in an iframe

## March 12, 2025
- Added blob storage system for large annotation content with expandable retrieval
- Added single annotation endpoint with blob expansion support

## March 10, 2025
- Added plot-vision mcp
- Added niivue_dist git submodule for NIFTI visualization

## March 8, 2025
- Added lazy loading implementation for DANDI assets on Dandiset page
- Added caching system to useQueryAssets for improved performance when loading DANDI assets
- Added "Load more files" button to DandisetPage that exponentially loads pages (1->2->4->8), with file count indicator showing loaded/total files

## March 7, 2025
- Updated @niivue/niivue from 0.49.0 to 0.51.0
- Enhanced TimeIntervals visualization to filter data based on visible time range
- Fix hover functionality to TimeIntervals plot to display additional data and interval information
- Fixed hover-over effect for time intervals in TimeIntervalsPlotly component (Issue #286)

## March 5, 2025
- Improve NWB python usage to include containers and ec_electrodes
- Switch to always using draft versions of dandisets
- Added notebook buttons to dataset pages, showing links from notebook-tagged notes

# March 4, 2025
- Use JavaScript for NWB usage scripts rather than loading from precomputed usage.py

## March 3, 2025
- Added Usage Script section to NWB page showing Python code examples

## February 28, 2025
- Added LINDI file download feature in NWB Overview

## February 27, 2025
- Implemented neurosift-chat-agent-tools
- Created neurosift-tools MCP that interfaces with the chat agent tools (for claude/cline access to DANDI, etc)
- Added documentation for installing neurosift-tools MCP server in Cline

## February 26, 2025
- Added highlighted views section to home page showing expandable annotated views
- MP4 views for TwoPhotonSeries and OnePhotonSeries for NWB files (uses job manager)
- Added annotations support for NWB files:
  - Shows titles, content, types, targets, and tags
  - Features clickable dandiset tags that navigate to the corresponding dandiset page
  - Includes creation and update timestamps
  - Requires Neurosift API key for access
- Added GitHub Actions workflow for pull requests that checks code formatting and build status
- Added annotations feature to Dandiset pages:
  - Users can add, view, and expand markdown-formatted notes
  - Notes are displayed with user attribution and timestamps
  - Notes appear in collapsible sections at the bottom of the dandiset overview
  - Added ability to edit and delete notes owned by the current user
  - Added edit form with title and content fields
  - Added ownership verification through job manager API
  - Added confirmation dialog before note deletion
  - Added ability to add and manage custom tags for annotations

## February 25, 2025
- Improved TimeIntervals visualization with interactive Plotly-based view that shows hover information and uses transparency to indicate overlapping intervals (fixes #278)
- Improved TimeIntervals plot by removing the top line and adjusting rectangles to start at y=0 for cleaner visualization
- Enhanced TimeIntervals controls by adding start time, duration, and interval count information and removing the gap between controls and plot
- Added reset button to TSV table view to restore original row order
- Added collapsible left panel with toggle button to improve workspace utilization
- Added AI context integration for NwbPage to provide information about currently viewed NWB file including version, contents overview, and available interactions
- Rewrote NIFTI viewer implementation using niivue library to provide advanced visualization features including multiplanar views and 3D rendering
- Added file size warning for NIFTI files larger than 100MB to prevent performance issues with large datasets
- Changed units controller navigation arrows in Raster plot from left/right to up/down for better visual representation
- Improved Raster plot UI with better layout and styling:
  - Removed gap between controls and plot for better visual association
  - Enhanced recording info display with cleaner styling and improved readability
  - Made controls layout responsive to screen width
- Modified ResponsiveLayout to determine mobile view based on initial browser width rather than using media queries and dynamic resizing

## February 24, 2025
- Added AI context integration for DandisetOverview component to provide comprehensive dataset information including name, description, contributors, dataset details, license, citation, keywords, species, and research methods
- Improved visibility of x-axis label in Raster Plot by adjusting font properties and grid display

## February 22, 2025
- Remove tab parameter from URL query string once page has been loaded
ods
- Imprve visibility of x-axis label in Rater Plot by adjusting font properties and grid display

## February 22, 2025
- Remove tab parameter from URL query string once page has been loaded

## February 21, 2025
- Added Events plugin view for NWB files that visualizes event timestamps with vertical markers
- Added AI Context system for parent window communication
- Added IntervalSeries plugin view for NWB files that visualizes alternating positive/negative interval data
- Updated OpenNeuro Browser's search mechanism to use a more robust state management pattern with scheduled search functionality

## February 20, 2025
- Added user management interface in Settings page for administrators
- Added admin secret key field in Settings for accessing user management
- Added ability to create, edit, and delete users with research descriptions
- Added user list view with basic information display
- Added confirmation dialog for user deletion to prevent accidental removal
- Added API key viewing capability for administrators with copy to clipboard functionality

## February 19, 2025
- Added advanced search mode for DANDI Archive Browser with neurodata type filtering
- Added matching files count indicator for advanced search results in DANDI Archive Browser
- Added horizontal spacing around splitter bar in HorizontalSplitter component
- Add SpikeDensity plugin view for NWB files
- Added job resubmission capability for failed jobs
- Added optional rastermap sorting to SpikeDensity plugin with UI controls for computing and toggling the sorting

## February 18, 2025
- Added distributed job processing system (neurosift-job-manager)
- Added support for embedded=1 query parameter
- Added feedback/issues link on home page footer
- Migration to v2 deployed
- Added external website links to DANDI and OpenNeuro browser pages

## February 17, 2025
- Added SNIRF file support with HDF5 viewer integration
- Added loading indicator when expanding directories in the file browser
- Added WAV file plugin with audio playback and waveform visualization
- Updated URL query parameter mapping between v1 to v2
- Adjusted home page layout
