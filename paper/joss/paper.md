---
title: 'Neurosift: DANDI exploration and NWB visualization in the browser'
tags:
  - javascript
  - web browser
  - neurophysiology
  - DANDI
  - Neurodata Without Borders (NWB)
authors:
  - name: Jeremy Magland
    orcid: 0000-0002-5286-4375
    affiliation: 1
    corresponding: true
  - name: Cody Baker
    orcid: 0000-0002-0829-4790
    affiliation: 2
  - name: Benjamin Dichter
    orcid: 0000-0001-5725-6910
    affiliation: 2
affiliations:
 - name: Center for Computational Mathematics, Flatiron Institute, USA
   index: 1
 - name: CatalystNeuro, USA
   index: 2
date: 23 February 2024
bibliography: paper.bib
---

# Summary

Neurosift, a browser-based visualization tool,
is designed for the interactive exploration of Neurodata Without Borders (NWB) files,
whether stored locally, on remote servers,
or within the Distributed Archives for Neurophysiology Data Integration (DANDI).
Neurodata Without Borders (NWB) [@teeters2015neurodata; @rubel2022neurodata] is an open data standard for neurophysiology that enables the sharing, archiving, and analysis of various types of neurophysiology data.
DANDI [@rubel2022neurodata] is a cloud-based platform that supports the storage, sharing, and analysis of neurophysiology data including NWB files.
With Neurosift integration, users browsing DANDI can easily open any NWB file in the browser,
and explore its contents, including timeseries data, images, and more.
Neurosift can also be used to browse the DANDI database or individual DANDIsets.
Overall, Neurosift simplifies the visualization and exploration of complex NWB file structures,
making it a valuable tool for neuroscientists.

# Statement of need

In the evolving field of neuroscience research, the ability to manage and share complex data sets is crucial. NWB has emerged as a standard for neurophysiology data, aimed at facilitating data sharing, storage, and analysis. However, the specialized nature of the NWB format necessitates tools that can provide intuitive interfaces for researchers to explore their data effectively. Neurosift is designed to address this need.

Because files found on DANDI can often be large and unwieldy, various Python tools have emerged to address this by streaming portions of the NWB file without the need to download the entire file. One such tool is NWB Widgets [@nwbwidgets], which provides a suite of interactive widgets for visualizing NWB data within Jupyter notebooks, enabling users to navigate the hierarchical structure of NWB files and directly visualize specific data elements. This package was a large part of the inspiration for Neurosift. The main difference is that NWB Widgets is a Python package that runs within interactive Python environments, while Neurosift is a browser-based tool that can be used without any installation. These two tools cater to different use cases, with Neurosift being more accessible to a wider audience, and being better suited for integration with DANDI.

# Functionality and user experience

Neurodata Without Borders files are structured hierarchically, encapsulating various *neurodata types* that reflect different aspects of neurophysiological experiments. These types range from *BehavioralEvents*, which record discrete actions or occurrences within experiments, to data structures like *Fluorescence*, *ImageSegmentation*, and *RoiResponseSeries*. Other neurodata types include *ElectricalSeries* for electrophysiological signals and *Units* for spike times of neurons. Neurosift allows interactive navigation of this hierarchical structure and provides plugin visualizations for many of these types. It also facilitates the creation of composite views by allowing users to select and synchronize multiple data types within the same interface. This synchronization extends to navigation actions such as zooming and panning, where different sub-windows, each displaying a different aspect of the data, maintain a shared time axis.

# Architecture and technical innovation

Neurosift is a *static* React/TypeScript website meaning that it is delivered to the user's browser exactly as stored, without the need for dynamic server-side processing of requests. This approach simplifies deployment and maintenance; It is currently being hosted on GitHub Pages, but it could easily be deployed to any other static hosting service.

The main technical challenge in developing Neurosift was the requirement to lazy-load data objects from remote NWB files, which are built on the complex HDF5 format. While HDF5's efficient data organization is ideal for the large, multidimensional datasets typical in neurophysiology, its primary implementations are in the C language. This necessitates a creative solution for web-based access and manipulation of these files. To bridge this gap, Neurosift leverages WebAssembly to run compiled C code in the browser, specifically utilizing a modified version of the h5wasm [@h5wasm] library. Unlike the original h5wasm, which built to handle fully downloaded files, Neurosift's fork introduces an innovative approach to efficiently reading data chunks from remote files. This allows for synchronous data reads without the need for a prior download of the entire file. This solution not only makes Neurosift a powerful tool for neuroscience research but also showcases the potential of WebAssembly in overcoming challenges associated with web-based data analysis tools.

In addition to HDF5-backed NWB files, Neurosift also supports NWB datasets stored using [Zarr][https://zarr.dev], which is a more efficient, cloud-friendly format, but which can be less convenient to manage since NWB-Zarr datasets can contain thousands of individual files in contrast to a single HDF5 file.

# Conclusion

Neurosift makes neurophysiology data more accessible for scientists. By facilitating the exploration of complex datasets directly within a browser, without requiring specialized programming knowledge, it lowers the barrier to entry for data analysis and fosters collaborative research efforts. Looking forward, there is potential for Neurosift to expand its capabilities, with enhanced visualizations and support for additional data types.

# Acknowledgements

Thank you to Jeff Soules who helped develop visualizations that were ported over to Neurosift.

# References
