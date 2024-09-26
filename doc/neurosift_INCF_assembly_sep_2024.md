# Exploring NWB Datasets on DANDI with Neurosift

INCF Neuroinformatics Assembly, September 26, 2024

Jeremy Magland, Center for Computational Mathematics, Flatiron Institute

Developed in collaboration with [CatalystNeuro](https://catalystneuro.com/)

## Neurosift overview

The main goal of Neurosift is to provide a user-friendly browser-based interface for exploring DANDI NWB files in a shared and collaborative environment.

* Visualization of remote NWB files
* Efficiently reads data lazily from remote or local NWB files (HDF5 or LINDI formats)
* Interactive exploration of DANDI

## DANDI Archive / Neurosift Integration

* Go to [DANDI](https://dandiarchive.org/)
* Click on PUBLIC DANDISETS
* Search for a Dandiset, for example [000552](https://dandiarchive.org/dandiset/000552?search=000552&pos=1)
* Click on FILES and [the first subject](https://dandiarchive.org/dandiset/000552/0.230630.2304/files?location=sub-e13-16f1&page=1)
* Choose a .nwb file and click [OPEN WITH -> Neurosift](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/47be899c-27a8-4864-a1e9-d7a3f92e522e/download/&dandisetId=000552&dandisetVersion=0.230630.2304)

![image](https://github.com/user-attachments/assets/54199f8d-34e1-4f64-99bb-236e94b0fc69)

![image](https://github.com/user-attachments/assets/28a2d17e-8020-4b1f-9ea6-fc62c828749e)

Click around to explore this file.

## Neurosift URL

Let's examine the above Neurosift URL

```text
https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/47be899c-27a8-4864-a1e9-d7a3f92e522e/download/&dandisetId=000552&dandisetVersion=0.230630.2304
```
The `url` query parameter points to the DANDI Archive API. You can point that to the URL of any remote NWB file (not just on DANDI).

## Opening local NWB files

You can also view local NWB files. This would be on your local machine -- it's not easy to do this on Dandihub.

```bash
# One-time install of neurosift (already installed above)
pip install --upgrade neurosift

# Open the local file (will open a browser window)
neurosift view-nwb /path/to/file.nwb
```

You can try this out by downloading one of [these relatively small NWB files](https://dandiarchive.org/dandiset/000946/draft/files?location=sub-BH494&page=1).

## Neurosift as DANDI Browser

The DANDI REST API is open to the public, so Neurosift can also function as an alternative DANDI Archive explorer!

[https://neurosift.app](https://neurosift.app)

![image](https://github.com/user-attachments/assets/c06ed41a-6842-4705-abb7-1d1a96487766)

## Efficient streaming of NWB files

* NWB files can be very large > 100 GB, so it's important to be able to lazy-load individual objects without downloading the entire file.
* However, HDF5 was designed to be read locally, so it's not particularly cloud-friendly - inefficient loading of metadata
* Neurosift uses a WebAssembly/Web Worker method to load remote files relatively efficiently via the browser.
* But what really speeds things up is the pre-indexing of all the public Dandisets using LINDI.

For more information, see the [LINDI project](https://github.com/neurodatawithoutborders/lindi).

For example [open this 137 GB file](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/8e55b7ac-a085-43c0-9dc9-c577bcbe1824/download/&dandisetId=000409&dandisetVersion=draft). There is a "Using LINDI" indicator on the left panel meaning that it found the pre-indexed .nwb.lindi.json file in the cloud and used that instead of the .nwb. The .json file efficiently stores all the meta information and references the original file for the data chunks.

Here's the corresponding LINDI JSON file for inspection: https://lindi.neurosift.org/dandi/dandisets/000409/assets/8e55b7ac-a085-43c0-9dc9-c577bcbe1824/nwb.lindi.json

LINDI uses a JSON representation of Zarr with external references to large binary chunks.

## Streaming objects from NWB files using Python

You can load NWB objects using Python.

* Go to [our example NWB file](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/25b641ae-5a56-49c2-893c-7dd19d039912/download/&dandisetId=000552&dandisetVersion=0.230630.2304).
* Click on processing/behavior -> SleepStates
* In the left panel, click on "Load in Python". You will get a Python script you can run to lazy load the data using LINDI.

![image](https://github.com/user-attachments/assets/3f8670f3-280f-4755-a494-d3762b95d400)

```python
import lindi

url = 'https://lindi.neurosift.org/dandi/dandisets/000552/assets/25b641ae-5a56-49c2-893c-7dd19d039912/nwb.lindi.json'

# Load the remote file
f = lindi.LindiH5pyFile.from_lindi_file(url)

# load the neurodata object
X = f['/processing/behavior/SleepStates']

id = X['id']
label = X['label']
start_time = X['start_time']
stop_time = X['stop_time']

print(f'Shape of id: {id.shape}')
print(f'Shape of start_time: {start_time.shape}')
print(f'Shape of stop_time: {stop_time.shape}')

# This line was added
print(label[()])

# Output:
# Shape of id: (46,)
# Shape of start_time: (46,)
# Shape of stop_time: (46,)
# ['Awake' 'Non-REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM' 'REM' 'Awake'
#  'Non-REM' 'REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM'
#  'REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM' 'REM' 'Awake' 'Non-REM' 'Awake'
#  'Non-REM' 'REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM'
#  'Awake' 'Non-REM' 'Awake' 'Non-REM' 'Awake' 'Non-REM' 'REM' 'Awake'
#  'Non-REM' 'REM' 'Awake' 'Non-REM' 'Awake']
```

Open a Jupyter notebook. In Dandihub this would be File -> New -> Notebook and select Python 3 kernel. Then paste in this code for the first cell and run the cell.

Then run the following line to see the labels data

```python
print(label[()])
```

## Neurosift tabs

What are the different Neurosift tabs?

![image](https://github.com/user-attachments/assets/1c82e9c1-2816-4df9-8eda-7fc1ee21c01f)

## NWB Tab

The NWB tab gives a hierarchical layout of the Neurodata objects in the NWB file with links to various visualization plugins.

![image](https://github.com/user-attachments/assets/6cf75967-d131-4bbd-8354-79508b13e833)

What are the checkboxes for?

* Clicking a Neurodata object directly will open the default visualization plugin for that Neurodata type.
* To get a synchronized composite view for selected items, tick two or more checkboxes and then click the "View xx items" button on the left panel.

## RAW Tab

The RAW tab shows the raw HDF5 structure: groups, datasets, attributes, etc.

![image](https://github.com/user-attachments/assets/1be63ee1-d6ee-4b4c-98d7-b28bfb50e696)

Tip: to inspect the contents of a larger dataset, open the browser developer console and click on the CIRCLE icon. The contents of the dataset will be printed to the console. For example in [this example](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/ffcb1836-587e-42f4-887b-50b02948b779/download/&dandisetId=000623&dandisetVersion=0.240227.2023) go to the RAW tab and navigate to processing -> behavior -> Blink -> TimeSeries -> data. Open the browser developer console and click the CIRCLE icon.

## WIDGETS Tab

The WIDGETS tab provides a widget-centric view of the file. For each relevant visualization plugin, you can see the neurodata objects that can be opened with it.

![image](https://github.com/user-attachments/assets/465ec755-0b21-4fea-a71a-57b815b2190f)

## SPECIFICATIONS Tab

The SPECIFICATIONS tab lets you visualize the HDMF spec that is embedded in the NWB file.

![image](https://github.com/user-attachments/assets/e14e161a-3f0c-44f0-a2d6-7882aa5d0f2f)

## DENDRO Tab

Will discuss elsewhere.

## Annotations Tab

Finally, the ANNOTATIONS tab is an advanced feature that lets you add annotations (notes) to Dandisets, NWB files, and individual Neurodata objects. Other users will be able to see your annotations.

Note: this is an experimental feature and is subject to change / deletion. We are not going to cover it in this tutorial.

## Advanced DANDI Queries

Click on “advanced query” in the upper-right corner of the [main neurosift page](https://neurosift.app).

You can filter by neurodata types. For example, in this screenshot, I searched for all Dandisets that have an object of type Units AND an object of type ElectricalSeries. This is based on a pre-indexing of public DANDI that includes only the first 100 assets of each Dandiset.

![image](https://github.com/user-attachments/assets/0595132d-cbc0-4d6e-8dd1-f896996f5922)

You can then select a subset of these Dandisets and perform a SPECIAL query using JSONPath or JavaScript syntax. For example you could ask it to:

* List all the neurodata types for the selected Dandisets
* List neurodata types within the acquisition group
* List all compressors
* List all unique descriptions of neurodata objects
* List the shapes of all ElectricalSeries with more than 1000 samples
* ...

![image](https://github.com/user-attachments/assets/e68abab0-62ff-48ca-b126-c369f5356b34)

## Example: Dandiset 000458

On DANDI Archive: [000458](https://dandiarchive.org/dandiset/000458?search=000458&pos=1)

Here's a [thorough description of the dataset](https://github.com/catalystneuro/dandi.github.io/blob/reuse_blog/_posts/data_reuse_000458.md) for purpose of reanalysis.

This notebook shows how to use the DANDI API to summarize all of the sessions: [001_summarize_contents.ipynb](https://github.com/dandi/example-notebooks/blob/master/000458/FlatironInstitute/001_summarize_contents.ipynb)

Here's one of the examples in Neurosift: [sub-551397/sub-551397_ses-20210211_behavior+ecephys.nwb](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/d966b247-2bac-4ef0-8b80-aae010f50c98/download/&dandisetId=000458&dandisetVersion=0.230317.0039)

![image](https://github.com/user-attachments/assets/a2bcc443-3b40-4438-a8c3-3a3776472c39)

As you can see we have EEG, LFP, epochs, trials, running speed, and units.

In the Units section click on "Raster Plot" and then adjust the number of visible units.

![image](https://github.com/user-attachments/assets/79da7344-60c8-411a-b2e6-d99af1928edb)

## Peri-Stimulus Time Histograms (PSTH)

Let's explore the Peri-Stimulus Time Histograms (PSTH)!

* [Open the above example from 000458 in Neurosift](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/d966b247-2bac-4ef0-8b80-aae010f50c98/download/&dandisetId=000458&dandisetVersion=0.230317.0039)
* Open the "Intervals" panel and then click "PSTH" for the "trials" table.
* Select "Group trials by: behavioral_epoch" and "Sort units by: location".
* Select "Trials filter" in the bottom right and enter `is_valid === 1 && is_running === 0 && stimulus_type === "electrical"`. This will restrict the trials to those that are valid, not running, and have an electrical stimulus.
* Scroll down on the units table and click to select some units in the MOs region. You can also use the "Select units" link at the bottom to select all MOs units.
* The raster plots show the spike trains for the unit where the Y-axis is the trial number and the X-axis is time aligned to the stimulus onset.
* Unit 500 shows a clear pattern of decreased activity following the stimulus for around 0.15 seconds and then a sharp increase in activity for the "awake" trials.
* Try adjusting the trials filter to have stimulus_type === "visual" instead of "electrical" to see that the pattern is not present for visual stimuli.
* Try selecting units at other locations.
* You can also adjust other settings.
* To share your view, use the "Share this tab" on the left panel of Neurosift. [Here's a link with the predefined state intact](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/d966b247-2bac-4ef0-8b80-aae010f50c98/download/&dandisetId=000458&dandisetVersion=0.230317.0039&tab=view:PSTH|/intervals/trials^/units&tab-state=H4sIAAAAAAAAA03SvW7bMBSG4VsxOGRSC%2FE3dgAvGYJk7d%2BSFIYiMRIBiTREKkEQ%2BN77SkGLDt%2Bgw8f00Qd9iOxH3xbf%2FYyhPHRZ3Dyag6zMQRFNDLHEkWuyJ4fK1jWRRBFNDLHEkWuyJziJkziJkziJkziJkziJkziFUziFUziFUziFUziFUziN0ziN0ziN0ziN0ziN0ziDMziDMziDMziDMziDMziLsziLsziLsziLsziLsziHcziHcziHc7g953vOD5zTm6U3S2%2BW3iy9WXqz9Oboy9GVoytXm9%2BVaMbQxx%2FpVzOH5nn0a%2FEil2YupxImLxD9nJbz7ftfIW7Esx%2Ba15DmZjz5c2oHUYnC4Zjvwlj8jAj59MrN3e54PO7k7upqx2ReYgyx32b1Osv8xTIu%2BVTez34bP4ntM5hD24xPgntzmsv6SeT%2FF3gUY2qbElJENLldt3wLsUtv35rY%2B%2B%2BFFT4%2B34JdvtRfLc7HjgcpLpU4z%2F4lb2RYf5K3ncu8%2BGqb3Idc%2Fj1PKZXBd5%2BzF96R4eBDP6xXT74Ly8TlcZluQ%2BROXV8ufwD179KNzQIAAA%3D%3D).
