# Reading NWB Files as Zarr

`RemoteH5FileZarr` presents an NWB file stored as Zarr through the same interface as the HDF5 and LINDI readers, so the rest of neurosift does not change. The arrays are read with [zarrita](https://github.com/manzt/zarrita.js). It reads two kinds of file:

- **A Zarr store written by hdmf-zarr.** The store's consolidated metadata gives the whole tree in one request. A url is read this way when it ends in `.zarr` or is a Zarr asset in a DANDI bucket (`/zarr/<id>/`). Both Zarr v3, which hdmf-zarr writes from version 0.14, and Zarr v2, which it wrote before, are read.
- **A [zarrshadow](https://github.com/bendichter/zarrshadow) reference file** for an HDF5 NWB file: Zarr v3 metadata plus, for every chunk, where its bytes are in the original file. A url is read this way when it ends in `.zarrshadow`, `.zarrshadow.json`, or `/refs.json`.

One reader serves all of these because hdmf-zarr 0.14 and zarrshadow mark what Zarr lacks the same way: soft links in a group's `_LINKS` attribute, object references as `{_REFERENCE: {path}}` in attributes and as the target's path in datasets, and compound types as the `struct` data type. A Zarr v2 store marks them in an earlier way (`zarr_link`, `zarr_dtype`), which `zarr2Source.ts` describes in the v3 form when the store is opened.

As of October 2026 every NWB Zarr asset on DANDI is Zarr v2: 68 assets, in dandisets 000719, 001546, 001778, and 002015.

A Zarr asset on DANDI opens from its dandiset's file list like an HDF5 one, by the asset's `/download/` url. DANDI redirects that url to the file for an HDF5 asset and answers 400 for a Zarr asset, so when there is no redirect, `getDandiZarrStoreUrl` (in `src/pages/NwbPage`) looks up the url of the store in the asset's metadata.

`store/` is a copy of the zarrshadow JavaScript store (`js/src` at commit 91c4cdb), which is not on npm yet. It is to be replaced by the package once that is published.

## Trying It

Write references for an NWB file with the Python package:

```python
from zarrshadow import generate_rfs, write_rfs

url = "https://api.dandiarchive.org/api/assets/<asset id>/download/"
write_rfs(generate_rfs(url), "example.nwb.zarrshadow")
```

Serve the folder from something that answers 404 for a missing file and allows requests from other origins, then open `/nwb?url=<url of the folder>`. Vite's own server is not suitable for the data: it answers a missing file with the app's index page, and Zarr leaves out chunks that hold only the fill value, so those chunks would read as garbage.

In the dev server (`npm run dev`) the default time series plot stays blank, for every reader: React's strict mode runs the effect that hands the canvas to a worker twice, and the second time fails. Use a production build (`npm run build && npx vite preview`), or switch the plot to Plotly with the button at the top right of the view.

## Compound Datasets

zarrita does not read the `struct` data type yet (https://github.com/manzt/zarrita.js/pull/464). Until it does, the reader opens a compound array as bytes, with the bytes of a record as one more axis, and reads the fields itself. A row comes back as the values of its fields in order, which is how the LINDI reader returns it.

## What Is Not Handled

- A store without consolidated metadata.
- In Zarr v2 stores, datasets that hdmf-zarr stored as Python pickles, which older versions did for some scalars, references, and compound columns, and compound datasets. These are listed, and their values come back undefined with a warning. Of the 23,179 arrays in the 68 assets on DANDI, 3 are pickled, all in dandiset 000719, and none is compound. Both kinds are more common in Zarr archives that are still in DANDI's bucket but are no longer an asset of a dandiset.
- A link from a Zarr v2 store into another file.
- A chunk of a compound dataset that was never written reads as zeros, not as the dataset's fill value.
- The Python Usage tab writes code that loads the file with LINDI, which does not open a Zarr store.
