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

For a list of available plugins, see [neurodata_types.md](doc/neurodata_types.md).

Beyond plots and graphs, Neurosift lets you browse the hierarchical structure of NWB files.

Here are a couple examples: [DANDI NWB File](https://flatironinstitute.github.io/neurosift/?p=/nwb&url=https://api.dandiarchive.org/api/assets/50b43c75-686f-4d06-acf2-cd0b1b42e8be/download/&dandisetId=000402&dandisetVersion=0.230307.2132) | [DANDIset](https://flatironinstitute.github.io/neurosift/?p=/dandiset&dandisetId=000402&dandisetVersion=0.230307.2132).

## Quick instructions for viewing a local .nwb file

* Prerequisite: [NodeJS v16 or higher](https://nodejs.org/en/download)
* Install the neurosift Python package: `pip install --upgrade neurosift`
* Run the following command in a terminal window:

```bash
neurosift view-nwb /path/to/file.nwb
```

This will open a web browser window with the Neurosift web app pointing to a symlinked copy of your file. You can then browse the file and visualize its contents.

When finished, you can stop the server by pressing Ctrl-C in the terminal window.

If you do not have an NWB file but want to try out this functionality, you can download [one of these relative small files](https://dandiarchive.org/dandiset/000946/draft/files?location=sub-BH494&page=1) from DANDI.

## Viewing a remote NWB file hosted somewhere other than on DANDI

See [How can I view a remote NWB file hosted somewhere other than on DANDI?](https://github.com/flatironinstitute/neurosift/issues/129#issuecomment-1961798285)

## Installation

To use Neurosift, you don't need to install anything. Just visit the [live site](https://flatironinstitute.github.io/neurosift) and start browsing DANDI.

You can also [install and run Neurosift locally for development purposes](doc/development_environment.md).

In addition to the frontend, there is also a [Python package called neurosift](https://pypi.org/project/neurosift/) that provides a command-line interface for viewing local NWB files. See the instructions above. The source code for this package is in the [python directory](python).

## Where to find documentation

* **Quick start:** If you are new to Neurosift, we recommend that you follow the links at the top of this README. Basic usage in the browser does not require installation. If you're looking for a quick way to view a local NWB file, see the instructions above.
* **Supported Neurodata types:** For a table of Neurodata Types and their corresponding Neurosift plugins, see [neurodata_types.md](doc/neurodata_types.md).
* **Development environment:** If you want to set up a development environment for updating current features or adding new ones, see [setting up a development environment](doc/development_environment.md). We welcome feedback and code contributions. Please submit a pull request or open an issue.
* **API documentations:** API documentation is not available at this point, but you the development environment documentation provides guidance on how to explore the source code.
* **Adding annotations (experimental):** For information on how to add annotations to NWB files, see [neurosift_annotations.md](doc/neurosift_annotations.md). This is an experimental feature that is still under development.

## Seeking help

Please report any issues or suggest features on the [GitHub issue tracker](https://github.com/flatironinstitute/neurosift/issues).

You can also use [Discussions](https://github.com/flatironinstitute/neurosift/discussions) to ask questions about how to use Neurosift or enhance your experience with it, share ideas and feedback that can help improve Neurosift, or discuss any related topics.

## See also

* [NWB Widgets](https://nwb-widgets.readthedocs.io/en/latest/)
* [NWB Explorer](https://github.com/MetaCell/nwb-explorer)

## License

Neurosift is licensed under the terms of the Apache License 2.0.

## Authors and acknowledgements

Jeremy Magland - main developer

Ben Dichter and Cody Baker from CatalystNeuro have helped with the NWB and DANDI integration.

Jeff Soules developed many of the visualizations that have been ported from SortingView.

Thank you to Ralph Peterson and Alessio Buccino for valuable feedback.

Thank you for the very constructive feedback from Alex Rockhill during the [JOSS](https://joss.theoj.org/) review process.

Jeremy is a member of the [Center for Computational Mathematics at the Flatiron Institute](https://www.simonsfoundation.org/flatiron/center-for-computational-mathematics/)
