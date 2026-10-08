# Reading NWB Files Through zarrshadow References

A prototype reader for [zarrshadow](https://github.com/bendichter/zarrshadow) reference files: Zarr v3 metadata plus, for every chunk, where its bytes are in the original file. `RemoteH5FileZarrShadow` presents such a file through the same interface as the HDF5 and LINDI readers, so the rest of neurosift does not change.

The arrays are read with [zarrita](https://github.com/manzt/zarrita.js). `store/` is a copy of the zarrshadow JavaScript store (`js/src` at commit 482174d), which is not on npm yet. It is to be replaced by the package once that is published.

## Trying It

Write references for an NWB file with the Python package, into a folder the dev server serves:

```python
from zarrshadow import generate_rfs, write_rfs

url = "https://api.dandiarchive.org/api/assets/<asset id>/download/"
write_rfs(generate_rfs(url), "public/zs/example.nwb.zarrshadow")
```

Then open `http://localhost:5173/nwb?url=http://localhost:5173/zs/example.nwb.zarrshadow`. A url is read this way when it ends in `.zarrshadow`, `.zarrshadow.json`, or `/refs.json`.

In the dev server (`npm run dev`) the default time series plot stays blank, for every reader: React's strict mode runs the effect that hands the canvas to a worker twice, and the second time fails. Use a production build (`npm run build && npx vite preview`), or switch the plot to Plotly with the button at the top right of the view.

## What Is Not Handled

- Compound datasets, which zarrshadow writes with the Zarr `struct` data type. zarrita does not read it yet (https://github.com/manzt/zarrita.js/pull/464).
- NWB files written directly as Zarr by hdmf-zarr, which mark links and references differently from references made from HDF5.
