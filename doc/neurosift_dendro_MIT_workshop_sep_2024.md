# Neurosift / Dendro Workshop

September, 2024

## Workshop Goals

- Learn how to use Neurosift and Dendro with hands-on examples
- Plan future projects / extensions

## Goals of Neurosift and Dendro

* Advance cloud visualization and analysis of NWB files on DANDI

## Setup for workshop

It is highly recommended that you bring your own laptop so you can follow along with the examples. You have a couple options

* Run things on your local machine
  - Works with Linux, Mac OS, maybe Windows Subsystem for Linux (WSL), and maybe Windows
  - You should install apptainer if you want to run the Dendro processing
* Run things on Dandihub (recommended)
  - Go to [https://hub.dandiarchive.org](https://hub.dandiarchive.org)
  - **Important:** You'll need to sign up ahead of time because it might take a bit of time to get approved. Please include "Neurosift+Dendro workshop" in the DANDI sign up form.
  - It is recommended that you select the "Base" server option.
  - Apptainer is already installed, but you'll need to `pip install --upgrade neurosift dendro`

![image](https://github.com/user-attachments/assets/2ebf70f2-d774-4b78-8bc9-75febc8bca78)

Let's get started!

## What is Neurosift?

* DANDI Archive exploration
* NWB file visualization (remote and local)
* Runs in browser - no installation required
* No server backend required (client-only - except for Dendro integration)
* Efficiently reads data lazily from remote or local HDF5 files
* Inspired by NWBWidgets
* In collaboration with CatalystNeuro

## DANDI Archive / Neurosift Integration

* Go to [DANDI](https://dandiarchive.org/)
* Click on PUBLIC DANDISETS
* Search for a Dandiset, for example [000552](https://dandiarchive.org/dandiset/000552?search=000552&pos=1)
* Click on FILES and [the first subject](https://dandiarchive.org/dandiset/000552/0.230630.2304/files?location=sub-e13-16f1&page=1)
* Choose a .nwb file and click [OPEN WITH -> Neurosift](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/47be899c-27a8-4864-a1e9-d7a3f92e522e/download/&dandisetId=000552&dandisetVersion=0.230630.2304)

![image](https://github.com/user-attachments/assets/54199f8d-34e1-4f64-99bb-236e94b0fc69)

![image](https://github.com/user-attachments/assets/28a2d17e-8020-4b1f-9ea6-fc62c828749e)

## Neurosift URL

Let's examine the above Neurosift URL

```text
https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/47be899c-27a8-4864-a1e9-d7a3f92e522e/download/&dandisetId=000552&dandisetVersion=0.230630.2304
```
The `url` query parameter points to the DANDI Archive API. You can point that to the URL of any remote NWB file (not just on DANDI).

## Opening local NWB files

You can also view local NWB files

```bash
# One-time install of neurosift
pip install --upgrade neurosift

# Open the local file (will open a browser window)
neurosift view-nwb /path/to/file.nwb
```

You can try this out by downloading one of [these relatively small NWB files](https://dandiarchive.org/dandiset/000946/draft/files?location=sub-BH494&page=1).

## Neurosift as DANDI Browser

The DANDI REST API is open, so Neurosift can also function as an alternative DANDI Archive explorer.

[https://neurosift.app](https://neurosift.app)

![image](https://github.com/user-attachments/assets/c06ed41a-6842-4705-abb7-1d1a96487766)

## Structure of an NWB file

* NWB (.nwb) uses HDF5 as the underlying format.
* HDF5 files store data hierarchically in groups and datasets, with metadata at each node.

![image](https://github.com/user-attachments/assets/b5a0c57c-e8bf-4804-948f-6b33c68b63cf)

(Image from https://www.neonscience.org/resources/learning-hub/tutorials/about-hdf5)

* NWB imposes further structure on HDF5 to create a hierarchy of "Neurodata Objects".
* Examples of Neurodata objects include ElectricalSeries, Units, BehavioralEvents, LFP, TimeIntervals, etc.

![image](https://github.com/user-attachments/assets/32199798-d56a-4fad-a6ba-5cf1c8adc04d)
(Image from Rübel et al, eLife 2023: https://elifesciences.org/articles/78362)

## Efficient streaming of NWB files

* NWB files can be very large > 100 GB, so it's important to be able to loazy-load individual objects without downloading the entire file.
* HDF5 was designed to be read locally, so it is not particularly cloud-friendly - inefficient loading of metadata
* Neurosift uses a WebAssembly/Web Worker trick to load remote files relatively efficiently via the browser.
* However, what really speeds things up is the pre-indexing of all the public Dandisets using LINDI.

For more information, see the [LINDI project](https://github.com/neurodatawithoutborders/lindi).

