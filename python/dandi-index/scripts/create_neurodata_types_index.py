#!/usr/bin/env python3

"""Write data/neurodata_types_index.json.gz, the index behind Neurosift's
neurodata-types search on the DANDI page.

For every NWB file whose asset info has been loaded, it lists the neurodata
types of the groups in that file:

    {"files": [{"dandiset_id", "dandiset_version", "asset_id", "asset_path",
                "neurodata_types": [...]}]}

The job runner serves the file at GET /api/neurodata-types-index.
"""

import gzip
import json
import os

DANDI_INDEX_ASSET_VERSION = "v7"


def create_neurodata_types_index(data_dir: str = "data") -> dict:
    with open(f"{data_dir}/dandi.json", "r") as f:
        dandisets = json.load(f)["dandisets"]
    files = []
    for dandiset in sorted(dandisets, key=lambda d: d["dandiset_id"]):
        dandiset_id = dandiset["dandiset_id"]
        dandiset_dir = f"{data_dir}/dandisets/{dandiset_id}"
        dandiset_fname = f"{dandiset_dir}/dandiset.json"
        if not os.path.exists(dandiset_fname):
            continue
        with open(dandiset_fname, "r") as f:
            dandiset_data = json.load(f)
        for nwb_file in dandiset_data.get("nwb_files", []):
            asset_id = nwb_file["asset_id"]
            asset_fname = (
                f"{dandiset_dir}/assets.{DANDI_INDEX_ASSET_VERSION}/{asset_id}.json"
            )
            if not os.path.exists(asset_fname):
                continue
            with open(asset_fname, "r") as f:
                asset_info = json.load(f)
            neurodata_types = sorted(
                {
                    obj["type"]
                    for obj in asset_info.get("neurodata_objects", [])
                    if obj.get("type")
                }
            )
            files.append(
                {
                    "dandiset_id": dandiset_id,
                    "dandiset_version": dandiset_data["version"],
                    "asset_id": asset_id,
                    "asset_path": nwb_file["path"],
                    "neurodata_types": neurodata_types,
                }
            )
    return {"files": files}


def main():
    index = create_neurodata_types_index()
    out_fname = "data/neurodata_types_index.json.gz"
    # Write atomically, so the job runner never serves a partial file.
    tmp_fname = f"{out_fname}.tmp.{os.getpid()}"
    with gzip.open(tmp_fname, "wt") as f:
        json.dump(index, f)
    os.replace(tmp_fname, out_fname)
    num_dandisets = len({x["dandiset_id"] for x in index["files"]})
    print(
        f"Wrote {out_fname}: {len(index['files'])} files in {num_dandisets} dandisets"
    )


if __name__ == "__main__":
    main()
