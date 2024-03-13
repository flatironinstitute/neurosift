<p align="center">
  <img src="https://github.com/flatironinstitute/neurosift/assets/844306/6fbc4e77-c16f-4b3e-b136-33d192ec1d94", height=80>
</p>

# Neurosift

Neurosift is a browser-based tool designed for the visualization of NWB (Neurodata Without Borders) files, whether stored locally or hosted remotely, and enables interactive exploration of the [DANDI Archive](https://dandiarchive.org/).

[Visit the live site!](https://flatironinstitute.github.io/neurosift)

Capabilities of Neurosift include:
- View DANDI NWB files - use the integrated menu of DANDI Archive to launch Neurosift from any NWB file asset within a public or embargoed DANDIset.
- Visualize remote NWB files hosted on non-DANDI web servers or cloud storage.
- Visualize local NWB files directly within your browser.
- Browse a DANDIset within Neurosift, enabling the selection and simultaneous viewing or browsing of one or more NWB files.
- Upcoming integration with Dendro for enhanced data analysis and visualization capabilities (more details to be announced).

Visualization plugins include:
- Timeseries data (spatial, electrical, events, ...)
- Images
- Time intervals
- Spike raster plots
- Peristimulus time histograms
- ...

Beyond plots and graphs, Neurosift lets you browse the hierarchical structure of NWB files.

Here are a couple examples: [DANDI NWB File](https://flatironinstitute.github.io/neurosift/?p=/nwb&url=https://api.dandiarchive.org/api/assets/50b43c75-686f-4d06-acf2-cd0b1b42e8be/download/&dandisetId=000402&dandisetVersion=0.230307.2132) | [DANDIset](https://flatironinstitute.github.io/neurosift/?p=/dandiset&dandisetId=000402&dandisetVersion=0.230307.2132).

[Here is a collection of DANDI examples highlighting the various view plugins](https://github.com/flatironinstitute/neurosift/wiki/Neurosift-DANDI-Examples)

## Quick instructions for viewing a local .nwb file

* Prerequisite: [NodeJS v16 or higher](https://nodejs.org/en/download)
* Install the neurosift Python package: `pip install --upgrade neurosift`
* Run the following command in a terminal window:

```bash
neurosift view-nwb /path/to/file.nwb
```

This will open a web browser window with the Neurosift web app pointing to a symlinked copy of your file. You can then browse the file and visualize its contents.

When finished, you can stop the server by pressing Ctrl-C in the terminal window.

## Viewing a remote NWB file hosted somewhere other than on DANDI

See [How can I view a remote NWB file hosted somewhere other than on DANDI?](https://github.com/flatironinstitute/neurosift/issues/129#issuecomment-1961798285)

## Installation

To use Neurosift, you don't need to install anything. Just visit the [live site](https://flatironinstitute.github.io/neurosift) and start browsing DANDI.

You can also [install and run Neurosift locally for development purposes](doc/development_environment.md).

In addition to the frontend, there is also a [Python package called neurosift](https://pypi.org/project/neurosift/) that provides a command-line interface for viewing local NWB files. See the instructions above. The source code for this package is in the [python directory](python).

## Seeking help

Please report any issues or suggest features on the [GitHub issue tracker](https://github.com/flatironinstitute/neurosift/issues).

## Contributing

We welcome feedback and code contributions. Please submit a pull request or open an issue.

To set up a development environment for updating current features or adding new ones, see [setting up a development environment](./doc/development.md).

## License

Neurosift is licensed under the terms of the Apache License 2.0.

## Authors and acknowledgements

Jeremy Magland - main developer

Ben Dichter and Cody Baker from CatalystNeuro have helped with the NWB and DANDI integration. 

Jeff Soules developed many of the visualizations that have been ported from SortingView.

Thank you to Ralph Peterson and Alessio Buccino for valuable feedback.

Jeremy is a member of the [Center for Computational Mathematics at the Flatiron Institute](https://www.simonsfoundation.org/flatiron/center-for-computational-mathematics/)
