# Neurosift

Neurosift provides a platform for the visualization of neuroscience data in the web browser. It caters to both individual users through its local mode, allowing the visualization of views directly from your device, as well as a remote access function for presenting your findings to other users on different machines. With Neurosift, you have the ability to construct a multitude of synchronized visuals such as spike raster plots, audio spectrograms, videos, video annotations, position decode fields, timeseries graphs, and more.

Neurosift is integrated with [DANDI Archive](https://dandiarchive.org/). You can browse the contents of a dandiset directly in your browser, and visualize the items using Neurosift views.

Here is an example:

https://flatironinstitute.github.io/neurosift/?p=/nwb&url=https://dandiarchive.s3.amazonaws.com/blobs/c86/cdf/c86cdfba-e1af-45a7-8dfd-d243adc20ced

Replace the url query parameter with the appropriate URL for your dandiset. Or you can point it to any NWB file on the web.

Or even simpler, Neurosift is now registered as an external service of DANDI archive, so you if you browse to an .nwb asset on DANDI, you can use the menu button to launch Neurosift directly.

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

## Contributing

We welcome feedback and code contributions. Please submit a pull request or open an issue.

## Developers

[Setting up a development environment](./doc/development.md)

## License

Neurosift is licensed under the terms of the Apache License 2.0.

## Authors and acknowledgements

Jeremy Magland - main developer

Ben Dichter and Cody Baker from CatalystNeuro have helped with the NWB and DANDI integration. 

Jeff Soules developed many of the visualizations that have been ported from SortingView.

Thank you to Ralph Peterson and Alessio Buccino for valuable feedback.

Jeremy is a member of the [Center for Computational Mathematics at the Flatiron Institute](https://www.simonsfoundation.org/flatiron/center-for-computational-mathematics/)
