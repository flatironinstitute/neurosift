#!/usr/bin/env python3

import os
import json
import time
import argparse
from _embedding import _generate_embeddings_if_needed

from _load_dandi_data import (
    _load_dandi_data,
    _load_nwb_files_in_dandiset,
    _fetch_dandiset_metadata,
)
from _load_asset_info import _load_asset_info


def update_data(*, update_assets: bool, generate_embeddings: bool):
    data_dir = "data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    dandi_fname = f"{data_dir}/dandi.json"
    if os.path.exists(dandi_fname):
        with open(dandi_fname, "r") as f:
            dandi_data = json.load(f)
        timestamp = dandi_data.get("timestamp", None)
    else:
        timestamp = None
    elapsed = time.time() - (timestamp or 0)
    if elapsed > 60 * 60:
        print("Updating dandi.json")
        dandi_data = _load_dandi_data()
        with open(dandi_fname, "w") as f:
            json.dump(dandi_data, f, indent=2)
    else:
        print("Skipping dandi.json update")
        with open(dandi_fname, "r") as f:
            dandi_data = json.load(f)
    dandisets = dandi_data["dandisets"]
    # sort by dandiset id:
    dandisets.sort(key=lambda x: x["dandiset_id"])
    for dandiset in dandisets:
        dandiset_id = dandiset["dandiset_id"]
        dandiset_data_dir = f"{data_dir}/dandisets/{dandiset_id}"
        if not os.path.exists(dandiset_data_dir):
            os.makedirs(dandiset_data_dir)
        dandiset_fname = f"{dandiset_data_dir}/dandiset.json"
        if os.path.exists(dandiset_fname):
            with open(dandiset_fname, "r") as f:
                dandiset_data = json.load(f)
            timestamp = dandiset_data.get("timestamp", None)
        else:
            dandiset_data = None
            timestamp = None
        version = dandiset["version"]
        start_time = time.time()
        elapsed = start_time - (timestamp or 0)
        if (version == "draft" and elapsed > 60 * 60 * 24) or (dandiset_data is None):
            print(f"Processing dandiset {dandiset_id}")
            dandiset_data = {
                "dandiset_id": dandiset_id,
                "version": dandiset["version"],
                "name": dandiset["name"],
                "created": dandiset["created"],
                "modified": dandiset["modified"],
                "asset_count": dandiset["asset_count"],
                "size": dandiset["size"],
                "contact_person": dandiset["contact_person"],
                "embargo_status": dandiset["embargo_status"],
                "star_count": dandiset["star_count"],
                "nwb_files": _load_nwb_files_in_dandiset(
                    dandiset_id=dandiset_id, version=dandiset["version"]
                ),
                "timestamp": time.time(),
            }
            dandiset_data["metadata"] = _fetch_dandiset_metadata(
                dandiset_id=dandiset_id, version=dandiset["version"]
            )

            with open(dandiset_fname, "w") as f:
                json.dump(dandiset_data, f, indent=2)
        else:
            print(f"Skipping {dandiset_id} update")
            with open(dandiset_fname, "r") as f:
                dandiset_data = json.load(f)

        if generate_embeddings:
            embeddings_fname = f"{dandiset_data_dir}/embeddings.json"
            _generate_embeddings_if_needed(
                dandiset_data=dandiset_data, embeddings_fname=embeddings_fname
            )

        if update_assets:
            for vvv0 in ["v1", "v2", "v3", "v4", "v5", "v6"]:
                # remove old asset info files
                asset_dir0 = f"{dandiset_data_dir}/assets.{vvv0}"
                if os.path.exists(asset_dir0):
                    print(f"Removing old asset info files in {asset_dir0}")
                    for fname in os.listdir(asset_dir0):
                        if fname.endswith(".json"):
                            os.remove(os.path.join(asset_dir0, fname))
                    os.rmdir(asset_dir0)
            vvv = "v7"
            vvv2 = "v7.2"
            for nwb_file in dandiset_data["nwb_files"][:50]:
                asset_id = nwb_file["asset_id"]
                asset_fname = f"{dandiset_data_dir}/assets.{vvv}/{asset_id}.json"
                asset_path = nwb_file["path"]
                need_to_create = True
                if os.path.exists(asset_fname):
                    with open(asset_fname, "r") as f:
                        asset_info = json.load(f)
                    if asset_info.get("version", None) == vvv2:
                        need_to_create = False
                if need_to_create:
                    print(f"{dandiset_id}: Updating asset info for {asset_path}")
                    if not os.path.exists(f"{dandiset_data_dir}/assets.{vvv}"):
                        os.makedirs(f"{dandiset_data_dir}/assets.{vvv}")
                    asset_info = _load_asset_info(
                        dandiset_id=dandiset_id,
                        asset_id=asset_id,
                        dandi_index_asset_version=vvv2,
                    )
                    assert asset_info["dandi_index_asset_version"] == vvv2
                    with open(asset_fname, "w") as f:
                        json.dump(asset_info, f, indent=2)
                else:
                    print(
                        f"{dandiset_id}: Asset info for {asset_path} already up to date"
                    )
                if time.time() - start_time > 15:
                    print(
                        f"Time limit reached for dandiset {dandiset_id}, moving to next"
                    )
                    break
        else:
            print(f"Skipping asset updates for dandiset {dandiset_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update DANDI data index")
    parser.add_argument(
        "--assets", action="store_true", help="Update asset information for NWB files"
    )
    parser.add_argument(
        "--embeddings",
        action="store_true",
        help="Generate semantic embeddings for dandiset titles and descriptions",
    )
    args = parser.parse_args()
    update_data(update_assets=args.assets, generate_embeddings=args.embeddings)
