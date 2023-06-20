# Timeseries graphs

A timeseries graph is a .ns-tsg file that contains a list of time series elements for plotting. You can create such a file using the neurosift Python package.

Here is an example script that will download the data and create an example timeseries graph file. You can create this .py file in the test directory and run it from there. It will create a file called head_velocity.ns-tsg in the test directory. Then you can browse to this file through the web browser and visualize it.

```python
import numpy as np
import kachery_cloud as kcl
import neurosift.views as nv


def create_head_velocity_plot():
    head_velocity_fname = kcl.load_file('sha1://dc71cc4b13d2162dfb16747fbb4ffef9b18688e5?label=head_velocity_newSmooth.npy)
    head_velocity = np.load(head_velocity_fname)
    sampling_frequency = 30
    tg = nv.TimeseriesGraph()
    tg.add_line_series(
        name='head-velocity',
        t=(np.arange(0, len(head_velocity)) / sampling_frequency).astype(np.float32),
        y=head_velocity.astype(np.float32),
        color='black'
    )
    return tg

def main():
    head_velocity_plot = create_head_velocity_plot()
    head_velocity_plot.save('head_velocity.ns-tsg')

if __name__ == '__main__':
    main()
```