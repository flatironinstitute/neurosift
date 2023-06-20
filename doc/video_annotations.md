# Video annotations

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
