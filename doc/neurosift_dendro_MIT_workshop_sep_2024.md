# Exploring and Analyzing NWB Datasets on DANDI with Neurosift and Dendro

**Workshop, McGovern Institute for Brain Research, MIT, September 13th, 2024**

Jeremy Magland

## Workshop Goals

- Learn Neurosift and Dendro with hands-on examples
- Encourage use of NWB and DANDI
- Plan future development to meet the needs of the neurophysiology community

## Objectives of Neurosift and Dendro

The main goal of Neurosift/Dendro is to provide a user-friendly interface for exploring and analyzing DANDI NWB files in a shared and collaborative environment.

* [Neurosift](https://neurosift.app/) is a browser-based tool designed for the visualization of NWB (Neurodata Without Borders) files, especially those hosted on the [DANDI Archive](https://dandiarchive.org/).
* Neurosift also enables interactive exploration of DANDI.
* Dendro is a data analysis system that runs containerized jobs on remote or local compute resources.
* Dendro jobs can be launched either from within Neurosift or using Python scripts.
* Neurosift, Dendro, and DANDI are integrated to provide a seamless user experience for exploring and analyzing NWB files.

Developed in collaboration with [CatalystNeuro](https://catalystneuro.com/).

Note: These tools are still at an early stage of development.

## Setup for workshop

It is highly recommended that you bring your own laptop so you can follow along with the examples. You have a couple options

* Option 1: Run things on Dandihub (recommended)
  - Go to [https://hub.dandiarchive.org](https://hub.dandiarchive.org)
  - **Important:** You'll need to sign up ahead of time because it might take a bit of time to get approved. Please include "Neurosift+Dendro workshop" in the DANDI sign up form.
  - It is recommended that you select the "Base" server option or if it is available **"MIT workshop (tmp)"**
  - Apptainer is already installed on Dandihub, but you'll need to neurosift and dendro as shown below.

![image](https://github.com/user-attachments/assets/2ebf70f2-d774-4b78-8bc9-75febc8bca78)

* Option 2: Run things on your local machine
  - Works with Linux, Mac OS, maybe Windows Subsystem for Linux (WSL), and maybe Windows
  - You should install apptainer if you want to run the Dendro processing

Whichever method you are using, you should install neurosift, dendro, and lindi as follows:

```bash
pip install --upgrade neurosift dendro lindi==0.4.0a2
```

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

The DANDI REST API is open to the public, so Neurosift can also function as an alternative DANDI Archive explorer!

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

* NWB files can be very large > 100 GB, so it's important to be able to lazy-load individual objects without downloading the entire file.
* However, HDF5 was designed to be read locally, so it's not particularly cloud-friendly - inefficient loading of metadata
* Neurosift uses a WebAssembly/Web Worker method to load remote files relatively efficiently via the browser.
* But what really speeds things up is the pre-indexing of all the public Dandisets using LINDI.

For more information, see the [LINDI project](https://github.com/neurodatawithoutborders/lindi).

For example [open this file](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/25b641ae-5a56-49c2-893c-7dd19d039912/download/&dandisetId=000552&dandisetVersion=0.230630.2304). There is a "Using LINDI" indicator on the left panel meaning that it found the pre-indexed .nwb.lindi.json file in the cloud and used that instead of the .nwb. The .json file efficiently stores all the meta information and references the original file for the data chunks.

Here's an example LINDI JSON file for inspection: https://lindi.neurosift.org/dandi/dandisets/000552/assets/47be899c-27a8-4864-a1e9-d7a3f92e522e/nwb.lindi.json

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

(Tip: to inspect the contents of a larger dataset, open the browser developer console and click on the CIRCLE icon. The contents of the dataset will be printed to the console.)

![image](https://github.com/user-attachments/assets/1be63ee1-d6ee-4b4c-98d7-b28bfb50e696)

## WIDGETS Tab

The WIDGETS tab provides a widget-centric view of the file. For each relevant visualization plugin, you can see the neurodata objects that can be opened with it.

![image](https://github.com/user-attachments/assets/465ec755-0b21-4fea-a71a-57b815b2190f)

## SPECIFICATIONS Tab

The SPECIFICATIONS tab lets you visualize the HDMF spec that is embedded in the NWB file.

![image](https://github.com/user-attachments/assets/e14e161a-3f0c-44f0-a2d6-7882aa5d0f2f)

## DENDRO Tab

Will discuss later.

## Annotations Tab

Finally, the ANNOTATIONS tab is an advanced feature that lets you add annotations (notes) to Dandisets, NWB files, and individual Neurodata objects. Other users will be able to see your annotations.

Note: this is an experimental feature and is subject to change / deletion.

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

## Dendro example: computing autocorrelograms

Most Neurosift features are client-side only meaning that the raw data is pulled directly from the NWB file and all calculations are made on the local machine. However, more advanced features require pre-processing of the data (e.g., using Python scripts). This is where Dendro comes in.

For example, suppose we want to view the Autocorrelograms for the units in the 000458 dataset. Sometimes this information is included in the Units table, but in this case it is not. We can use Dendro to calculate the Autocorrelograms and then view them in Neurosift.

Again [go to our 000458 example](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/d966b247-2bac-4ef0-8b80-aae010f50c98/download/&dandisetId=000458&dandisetVersion=0.230317.0039). Open the Units panel and click on the "Units" link. Then click on the "Units Summary" tab.

![image](https://github.com/user-attachments/assets/1dddee66-07a3-4620-a5b7-e252a009473c)

We notice that somebody has already run the Dendro job to calculate the units summary, and so we can already see the Autocorrelograms.

Click on the job ID link to get more information on the job that what executed.

![image](https://github.com/user-attachments/assets/a293417e-c3c9-47bf-81ed-89b171dbd868)

We see that this was completed 3 days ago with an elapsed time of 41 seconds.

Scroll down to see more information.

![image](https://github.com/user-attachments/assets/ec6e9ed6-b4a6-4247-b64d-60ada36abc1f)

We can see the URLs of the input and output files as well as the values of the parameters that were used. You can also see the console output of the job and resource utilization graphs.

## Computing autocorrelograms for a new dataset

Suppose you navigate to an NWB file that does not have the Autocorrelograms pre-computed. You can run a new Dendro job yourself.

[Select a different 000458 example from here](https://neurosift.app/?p=/dandiset&dandisetId=000458&dandisetVersion=0.230317.0039) (note, some of them don't have a Units table)

As above, click on the "Units" link, click on the "Units" link and then the "Units Summary" tab.

Maybe it will say "no jobs found". You can specify your desired parameters and then click "SUBMIT JOB".

![image](https://github.com/user-attachments/assets/a3108973-08dc-4dd6-a895-b497f57811a4)

Here's where you have a choice. You can:

* Submit to the default publicly available computation network (might take a while to be picked up by a worker)
* Host your own Dendro compute client (e.g., on Dandihub) and submit the job specifically to that client.

Let's focus on the second option since it's more interesting and will illustrate how the Dendro system works!

## Hosting your own Dendro compute client

First you'll need to send your Github user name to Jeremy so he can give you permission to fulfill jobs for Neurosift.

The following can be done either on Dandihub or on your local machine (see above for setup).

Create a new directory for your compute client

```
mkdir dendro_compute_client
cd dendro_compute_client
```

Create the compute client

```
dendro register-compute-client
```

* You will be prompted to enter the name of the dendro service. Enter "hello_world_service" (this is the one Neurosift uses).
* For the name of the client, you can choose a simple descriptive name such as "magland_dandihub" if your user name is magland.
* Visit the link that is provided to complete the registration process. You will need to Log in with GitHub and you may need to follow a link after login to get back to the registration page.
* Follow the instructions. You will get a registration code which you will need to paste back to your terminal.
* Follow the link to configure your compute resource

![image](https://github.com/user-attachments/assets/200f4859-9071-462c-92df-f92135438f05)


You can restrict to particular users or not. If you do not restrict, then your compute client is added to the public network and can be used by all Neurosift users.

You can also adjust the available CPU/GPU/RAM resources to match your machine.

Now run your compute client!

```bash
CONTAINER_METHOD=apptainer dendro start-compute-client
```

Note: If you don't specify `CONTAINER_MEthod=apptainer` the default is to use docker (which is not available on Dandihub).

Leave your terminal open. You can use tmux or screen if you are worried about closing the terminal or losing connection.

## Back to computing autocorrelograms

Now that you have your compute client running, you can go back to Neurosift and submit the job to your compute client.

Enter your compute client ID in the "Compute client (optional)" field and click "SUBMIT JOB".

You should see some activity in your terminal where the compute client is running. It does the following

* Pulls the job information from the Dendro server
* Pulls the relevant docker image from dockerhub
* Builds the apptainer container
* Runs the job reporting the status and console output to Dendro
* Uploads the results to Dendro

You can use the refresh button in Neurosift to see the status of the job or click on the job ID to see more details such as the console output.

When the job is complete, you'll see the Autocorrelograms! And in the future, anyone who views this NWB file in Neurosift will see the Autocorrelograms without needing to recompute them.

For those in this workshop, if you did not restrict your compute client to only your user, we now have a shared pool of compute resources that can be used for everyone's Neurosift jobs, making efficient use of idle CPU/GPU resources.

## Dendro Provenance Tab in Neurosift

Let's [go back to our 000458 example](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/d966b247-2bac-4ef0-8b80-aae010f50c98/download/&dandisetId=000458&dandisetVersion=0.230317.0039) and click on the Dendro tab.

![image](https://github.com/user-attachments/assets/f4d3ca3e-0fa1-46dc-8cde-7f3954a3ea35)

You can see that this file was used as input for two Dendro jobs. You can click on those to see the job details.

Now check out [this example which is the result of spike sorting](https://neurosift.app/?p=/nwb&url=https://tempory.net/f/dendro/f/hello_world_service/hello_neurosift/spike_sorting_post_processing/JVSA4wyX1YGz7SQdesmM/output/post.nwb.lindi.tar&dandisetId=000409&dandisetVersion=draft&st=lindi). Click on the Dendro tab to see the provenance pipeline of the files that were used to generate this output.

![image](https://github.com/user-attachments/assets/680b518a-29b4-41b2-89e4-27d38aa4259a)

## CEBRA embedding example

[CEBRA](https://cebra.ai/) is a machine-learning method that can be used to compress time series in a way that reveals otherwise hidden structures in the variability of the data.

Let's take a look at

> [Dandiset 000140](https://dandiarchive.org/dandiset/000140/draft) -- MC_Maze_Small: macaque primary motor and dorsal premotor cortex spiking activity during delayed reaching

[Open the one session in Neurosift](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/7821971e-c6a4-4568-8773-1bfa205c13f8/download/&dandisetId=000140&dandisetVersion=draft)

![image](https://github.com/user-attachments/assets/d4182bdf-5abe-4dd4-8f57-0e6656f06dbe)

We've got a trials table (100 trials), three SpatialSeries objects (cursor_pos, eye_pos, hand_pos), and 142 neural Units.

Click on the "Units" link and then the "CEBRA" tab. Here you can queue up a job to compute a CEBRA embedding for the Units.

![image](https://github.com/user-attachments/assets/a7fe1fa7-2299-4e9a-9447-d444ee29cabd)

This produces a new NWB file with the CEBRA embedding added on as a new TimeSeries object. Click on the "View output in Neurosift" link to view the output file.

![image](https://github.com/user-attachments/assets/31d7a591-f783-45e3-87e2-aef71f3e1672)

Notice there is a new object at processing/CEBRA/embedding.

Tick the checkboxes for "trials and "embedding" and then click "View 2 items" in the left panel to get a synchronized view of the trials and the CEBRA embedding.

![image](https://github.com/user-attachments/assets/abf98469-e680-40f6-af9f-7e6eff60b228)

You can see that the embedding has periodic structure that matches the trial structure! This is significant because in this case we did not provide the trial structure or the behavioral data to the CEBRA process. It was able to infer the trial structure from the neural data alone.

## LINDI - output NWB files contain references to the input NWB files

In that last CEBRA example, the input was an NWB file from DANDI, and the output was a new NWB file containing all the information and data from the input file plus the CEBRA embedding. This was a relatively small file, but what happens when the input file is very large (e.g., contains raw electrophysiology data)? That's where LINDI comes in.

[Read more about LINDI here](https://github.com/NeurodataWithoutBorders/lindi/tree/additional-url-resolver). Note that this link points to a development branch of LINDI that describes the features that Dendro uses. It is not yet agreed upon and settled. Hopefully this will merge into the main branch soon.

Still to figure out: whether we will have LINDI/Dandi integration and what that will look like.

For now you can use the lindi Python package to read .lindi.json and .lindi.tar files as though they were HDF5 files, and you can even use pynwb!

For example, to load that embedding object in Python, do the following.
* [Open it in Neurosift](https://neurosift.app/?p=/nwb&url=https://tempory.net/f/dendro/f/hello_world_service/hello_cebra/cebra_nwb_embedding_6/ujOk88BJmLM1zjGH4Xwr/output/output.nwb.lindi.tar&dandisetId=000140&dandisetVersion=draft&st=lindi&tab=neurodata-item:/processing/CEBRA/embedding|TimeSeries)
* Click on the "Load in Python" link in the left panel.

You should see something like this:

```python
import lindi

url = 'https://tempory.net/f/dendro/f/hello_world_service/hello_cebra/cebra_nwb_embedding_6/ujOk88BJmLM1zjGH4Xwr/output/output.nwb.lindi.tar'

# Load the remote file
f = lindi.LindiH5pyFile.from_lindi_file(url)

# load the neurodata object
X = f['/processing/CEBRA/embedding']

starting_time = X['starting_time'][()]
rate = X['starting_time'].attrs['rate']
data = X['data']

print(f'starting_time: {starting_time}')
print(f'rate: {rate}')
print(f'data shape: {data.shape}')
```

You can then do this using pynwb:

```python
import pynwb

io = pynwb.NWBHDF5IO(file=f, mode='r')
nwbfile = io.read()
embedding = nwbfile.processing['CEBRA']['embedding']
print(embedding)]
```

That's a remote .nwb.lindi.tar file that has embedded references to the remote HDF5 .nwb file on DANDI, and we are able to load it as though it were a local .nwb file!

## Viewing DANDI .avi video files

DANDI supports uploading of .avi files, but currently there is no way to preview/stream those files in the browser. Neurosift provides a workaround by using Dendro to precompute .mp4 files associated with portions of those .avi files. [Here is an example](https://neurosift.app/?p=/avi&url=https://api.dandiarchive.org/api/assets/3d760886-c1ac-467d-bd87-3dfd71a5cb65/download/&dandisetId=001084&dandisetVersion=draft).

![image](https://github.com/user-attachments/assets/d0fb4e5f-7a10-4b05-a9a9-f654ced566cb)


## "Hello world" Dendro examples

[Here's an introduction on submitting simple "hello world" jobs and pipelines to Dendro](https://github.com/magland/dendro/blob/main/README.md).

For creating your own containerized Dendro apps, [check out these examples](https://github.com/magland/dendro/tree/main/apps).

## Example: Dandiset 000363

[000363: Mesoscale Activity Map Dataset](https://dandiarchive.org/dandiset/000363/0.231012.2129)

[View Dandiset in Neurosift](https://neurosift.app/?p=/dandiset&dandisetId=000363&dandisetVersion=draft)

Let's explore this example session: [sub-440956/sub-440956_ses-20190208T133600_behavior+ecephys+ogen.nwb](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/0eab806c-c5c3-4d01-bd7c-15e328a7e923/download/&dandisetId=000363&dandisetVersion=draft)

Behavior timeseries from DeepLabCut: Jaw tracking, Nose tracking, and Tongue tracking:

![image](https://github.com/user-attachments/assets/1bf9ef88-e887-437d-bb17-7238d84752c4)

![image](https://github.com/user-attachments/assets/9623375e-3bc2-4bc9-a11c-5df5a88707d5)


Table of trials:

![image](https://github.com/user-attachments/assets/7af887f4-2aaf-4e33-a806-80e5b0afc4a1)

1735 Units:

![image](https://github.com/user-attachments/assets/b9eca106-13a0-4ff7-b037-eb3737d4b4ce)

Task from Vincent Prevosto:

* Create a phase timeseries for each behavior and add to the NWB file
* Generate phase tuning curves for each unit and record tuned phase and p-value in the Units table.

We created a special Dendro function to do perform these tasks. [Here is the source code](https://github.com/magland/dendro/blob/main/apps/hello_neurosift/TuningAnalysis000363/TuningAnalysis000363.py).

We then submitted this custom job using the following Python script:

```python
from dendro.client import submit_job, DendroJobDefinition, DendroJobRequiredResources, DendroJobInputFile, DendroJobOutputFile, DendroJobParameter

# https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/0eab806c-c5c3-4d01-bd7c-15e328a7e923/download/&dandisetId=000363&dandisetVersion=draft
input_url = 'https://api.dandiarchive.org/api/assets/0eab806c-c5c3-4d01-bd7c-15e328a7e923/download/'

service_name = 'hello_world_service'
app_name = 'hello_neurosift'
processor_name = 'tuning_analysis_000363'
job_definition = DendroJobDefinition(
    appName=app_name,
    processorName=processor_name,
    inputFiles=[
        DendroJobInputFile(
            name='input',
            url=input_url,
            fileBaseName='input.nwb'
        )
    ],
    outputFiles=[
        DendroJobOutputFile(
            name='output',
            fileBaseName='output.nwb.lindi.tar'
        )
    ],
    parameters=[
        DendroJobParameter(
            name='units_path',
            value='/units'
        ),
        DendroJobParameter(
            name='behavior_paths',
            value=[
                '/acquisition/BehavioralTimeSeries/Camera0_side_JawTracking',
                '/acquisition/BehavioralTimeSeries/Camera0_side_NoseTracking',
                '/acquisition/BehavioralTimeSeries/Camera0_side_TongueTracking'
            ]
        ),
        DendroJobParameter(
            name='behavior_dimensions',
            value=[
                1,
                1,
                1
            ]
        ),
        DendroJobParameter(
            name='behavior_output_prefixes',
            value=[
                'jaw',
                'nose',
                'tongue'
            ]
        )
    ]
)
required_resources = DendroJobRequiredResources(
    numCpus=4,
    numGpus=0,
    memoryGb=4,
    timeSec=60 * 50
)

job = submit_job(
    service_name=service_name,
    job_definition=job_definition,
    required_resources=required_resources,
    target_compute_client_ids=None,
    tags=[],
    skip_cache=False,
    rerun_failing=True,
    delete_failing=True
)

print(job.job_url, job.status)
```

To see the results, go to the DENDRO tab [in our example](https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/0eab806c-c5c3-4d01-bd7c-15e328a7e923/download/&dandisetId=000363&dandisetVersion=draft).

![image](https://github.com/user-attachments/assets/db11af70-5391-4ceb-9a1a-5222ac2a350d)

Click on the "output" for the tuning_analysis_000363 job.

It's the same NWB file but with some additional objects

![image](https://github.com/user-attachments/assets/bc974e3b-9aaa-4129-b0a8-d95d525d8211)

Tick the two checkboxes shown in the screenshot, then "View 2 items", and you'll be able to see the computed phase compared with the position of the jaw.

![image](https://github.com/user-attachments/assets/115dee03-de66-4021-ace5-7f41998e49b5)

If you open the Units table and scroll to the right, you'll see new columns for the tuned phase, including the p-values.

![image](https://github.com/user-attachments/assets/3148e99b-5551-48b7-be1c-cc77908f6a6c)

Next steps

* Add a custom phase tuning plot view in Neurosift.
* Once satisfied with the results, apply this processing to the entire Dandiset.
* Create tools for aggregating and visualizing the results across the entire Dandiset.

## Spike sorting

I will fill in this section shortly.
