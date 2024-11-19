lou is a python package for submitting neurosift-related dendro jobs. I am going to teach you how to use lou.

```python
# Submit a multiscale spike density job
submit_multiscale_spike_density_job(
    dandiset_id='[dandiset_id]',
    nwb_url='[nwb_url]',
    units_path='[units_path]'
)

# Submit a rastermap job
submit_rastermap_job(
    dandiset_id='[dandiset_id]',
    nwb_url='[nwb_url]',
    units_path='[units_path]'
)

# Submit a image series to mp4 job
submit_image_series_to_mp4_job(
    dandiset_id='[dandiset_id]',
    nwb_url='[nwb_url]',
    path='[path]',
    duration_sec=60
)
```
