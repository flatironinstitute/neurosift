# Neurosift

Interactive neuroscience visualizations in the browser.

Neurosift provides a platform for the creation, visualization, and sharing of complex neuroscience data straight from your web browser. It caters to both individual users through its local mode, allowing the processing of views directly from your device, as well as a remote access function for presenting your findings to other users on different machines. With Neurosift, you have the ability to construct a multitude of synchronized visuals such as spike raster plots, audio spectrograms, videos, video annotations, position decoding fields, and timeseries graphs.

## Necessary System Specifications

* Operating Systems: Linux, Mac, or Windows
* Web Browsers: Chrome or Firefox
* Software: NodeJS v16 or higher

## Instructions for Installation and Setup

We suggest installing Neurosift within a conda environment or a virtual environment.

First, clone the repository and install from source:

```bash
git clone https://github.com/scratchrealm/neurosift
cd neurosift/python
pip install -e .
```

Next, create a folder for your data and generate some test files:

```bash
mkdir -p ~/rtcshare_data/test
cd ~/rtcshare_data/test
# transfer some data files into this test directory, these could be in .mp4, .avi, or .py formats
```

Share the data folder utilizing rtcshare:

```bash
cd ~/rtcshare_data
rtcshare start --dir .
# keep this terminal window running
```

Go to https://scratchrealm.github.io/neurosift in your web browser. From here, you should be able to navigate to the test directory and see your files. You can then click on the files to visualize them.

## Remote Access Capability

To make your visualizations remotely accessible, for instance, to share your work with colleagues, simply add the --enable-remote-access option to rtcshare:

```bash
cd ~/rtcshare_data
rtcshare start --dir . --enable-remote-access
```

Then you will need to modify the URL in your web browser to include the remote access server address. (TODO: explain how to do this)

## Visualizing videos

To visualize a video, simply browse to and click the video file through the web browser. You can then use the controls to play, pause, and seek through the video. You can also click on the slider to seek to a specific time. Right now, only .mp4 and .avi files are supported (but we can easily expand this to other formats - just let us know).

## Visualizing video annotations

A Neurosift video annotation is a .ns-van file that contains a list of video frame annotations, including nodes and edges. You can create such a file using the neurosift Python package.

Here is an example script that will download the data and create an example video annotation file. You can create this .py file in the test directory and run it from there. It will create a file called video_annotation.ns-van in the test directory. Then you can browse to this file through the web browser and visualize it.

```python
# prepare_video_annotation.py

import numpy as np
import cv2
import kachery_cloud as kcl
import neurosift.views as nv


nose_annotations_npy_uri = 'sha1://e2f20d56d6e4ecbce18112027a8cc13e3554d3ac?label=nose_annotations_noInterp.npy'
butt_annotations_npy_uri = 'sha1://d35f0f5a6deceb49c3fd0528ee52566a804ccd37?label=butt_annotations_noInterp.npy'
head_annotations_npy_uri = 'sha1://e1c57fb7dac7c493db5b884d43c819763011a779?label=head_annotations_noInterp.npy'

head_annotations = kcl.load_npy(head_annotations_npy_uri).astype(np.float32)
butt_annotations = kcl.load_npy(butt_annotations_npy_uri).astype(np.float32)
nose_annotations = kcl.load_npy(nose_annotations_npy_uri).astype(np.float32)

width = 640
height = 512
fps = 30.0
num_frames = 62999

frames: list[nv.VideoAnnotationFrame] = []
for j in range(num_frames):
    elements: list[nv.VideoAnnotationElement] = []
    p_head = head_annotations[j]
    p_butt = butt_annotations[j]
    p_nose = nose_annotations[j]
    if not np.isnan(p_head[0]):
        elements.append(nv.VideoAnnotationNodeElement('h', x=p_head[0], y=p_head[1]))
    if not np.isnan(p_butt[0]):
        elements.append(nv.VideoAnnotationNodeElement('b', x=p_butt[0], y=p_butt[1]))
    if not np.isnan(p_nose[0]):
        elements.append(nv.VideoAnnotationNodeElement('n', x=p_nose[0], y=p_nose[1]))
    if not np.isnan(p_nose[0]) and not np.isnan(p_head[0]):
        elements.append(nv.VideoAnnotationEdgeElement('n-h', id1='n', id2='h'))
    if not np.isnan(p_head[0]) and not np.isnan(p_butt[0]):
        elements.append(nv.VideoAnnotationEdgeElement('h-b', id1='h', id2='b'))
    F = nv.VideoAnnotationFrame(elements=elements)
    frames.append(F)

nodes: list[nv.VideoAnnotationNode] = [
    nv.VideoAnnotationNode(id='n', label='nose', color_index=0),
    nv.VideoAnnotationNode(id='h', label='head', color_index=1),
    nv.VideoAnnotationNode(id='b', label='butt', color_index=2)
]

A = nv.VideoAnnotation(
    width=width,
    height=height,
    frames_per_second=fps,
    frames=frames,
    nodes=nodes
)
A.save('video_annotation.ns-van')
```

## Authors

Jeremy Magland, Jeff Soules, and Ralph Peterson