stu is a python package for interacting with the dandi archive. I am going to teach you how to use stu.

If you want to get all public dandisets:

```python
import stu
dandisets = stu.get_all_public_dandisets()
```

If you want to get one dandiset by ID:

```python
dandiset = stu.get_dandiset_by_id('000001')
```

Each of these is now an object with the following attributes:

```python
dandiset.dandiset_id # the 6-digit ID of the dandiset
dandiset.dandiset_version # the version of the dandiset
dandiset.url # the URL of the dandiset on the DANDI archive website
```

You can get a list of nwb files in the dandiset like this:

```python
nwb_files = dandiset.get_nwb_files(limit=10)
```

Each of these nwb files has the following attributes:

```python
nwb_file.file_path # the path to the nwb file in the dandiset
nwb_file.asset_id # the asset ID of the nwb file
nwb_file.size # the size of the nwb file in bytes
nwb_file.download_url # the download URL of the nwb file
nwb_file.lindi_json_url # the URL of the cached lindi file for the nwb file for efficient access
```

For each nwb file you can get a list of the neurodata objects in the file like this:

```python
neurodata_objects = nwb_file.get_neurodata_objects()
```

Each of these neurodata objects has the following attributes:

```python
neurodata_object.object_path #the path to the neurodata object in the nwb file
neurodata_object.neurodata_type # the type of the neurodata object
```

If the neurodata object has neurodata_type of Units, then you can get the colnames of the units table via:

```python
# This will be a list of strings
unit_colnames = neurodata_object.get_attr('colnames')
```

To upload a file to https://lindi.neurosift.org/tmp/... you can use:

```python
stu.upload_file('https://lindi.neurosift.org/tmp/...', 'path/to/file')
```

where 'path/to/file' is the path to the file you want to upload and 'https://lindi.neurosift.org/tmp/...' is the URL you want to upload it to.
