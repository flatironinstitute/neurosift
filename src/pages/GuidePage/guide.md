# Neurosift Guide

## Overview

Neurosift is a browser-based tool designed for the visualization of NWB (Neurodata Without Borders) files, whether stored locally or hosted remotely. It also enables interactive exploration of the [DANDI Archive](https://dandiarchive.org/) and [OpenNeuro](https://openneuro.org/) (OpenNeuro integration is at an early stage).

**This is the new (next) version of Neurosift. To view the current stable version visit [https://neurosift.app](https://neurosift.app)**

## Using Neurosift

### Exploring DANDI Archive

1. Click on DANDI in the Neurosift home page
2. Browse available datasets or use the search functionality
3. Select a Dandiset to view its details and files
4. Click on any NWB file to visualize its contents

### Using OpenNeuro

Note: OpenNeuro integration is still at an early stage and does not have much functionality yet.

1. Click on OpenNeuro in the Neurosift home page
2. Browse through available datasets
3. Select a dataset to explore its sessions and files

### Viewing Remote NWB Files

To view NWB files hosted on other web servers or cloud storage:

1. Ensure your file is hosted with CORS enabled
2. Use the URL format: `https://neurosift2.vercel.app/nwb?url=YOUR_FILE_URL`

You may run into CORS issues if the server hosting the file does not allow cross-origin requests. In that case, you must give https://neurosift2.vercel.app permission to issue GET and HEAD requests to your server.

### Viewing Local Files

To view local NWB files directly in your browser:

1. Install the neurosift Python package:
   ```bash
   pip install --upgrade neurosift
   ```
2. Run the command:
   ```bash
   neurosift view-nwb /path/to/file.nwb
   ```
3. This will open Neurosift in your browser with your local file
4. When finished, press Ctrl-C in the terminal to stop the server

**Note that this will open the previous version of Neurosift, but you can modify the URL accordingly to use this version.**

## Getting Help

If you encounter any issues or have questions:

- Visit the [GitHub issue tracker](https://github.com/flatironinstitute/neurosift/issues) to report problems or request features
