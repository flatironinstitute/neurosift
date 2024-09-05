# Neurosift / Dendro Workshop

September, 2024

## Workshop Goals

- Learn how to use Neurosift and Dendro with hands-on examples
- Plan future projects / extensions

## Goals of Neurosift and Dendro

* Advance cloud visualization and analysis of NWB files on DANDI

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
The url query parameter points to the DANDI Archive API. You can point that to the URL of any remote NWB file (not just on DANDI).

## Opening local NWB files on DANDI

You can also view local NWB files on DANDI

```bash
# One-time install of neurosift
pip install --upgrade neurosift

# Open the local file (will open a browser window)
neurosift view-nwb /path/to/file.nwb
```


