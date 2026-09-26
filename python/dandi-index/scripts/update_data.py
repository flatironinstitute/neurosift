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

# How long to wait before retrying an asset whose info could not be loaded.
FAILED_ASSET_RETRY_SECONDS = 7 * 24 * 60 * 60


def _write_json(fname: str, data):
    """Write atomically, so readers (the job runner, or other workers) never
    see a partially written file."""
    tmp_fname = f"{fname}.tmp.{os.getpid()}"
    with open(tmp_fname, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp_fname, fname)


def update_data(
    *,
    update_assets: bool,
    generate_embeddings: bool,
    asset_time_limit: float = 15,
    shard: tuple = (0, 1),
):
    """Update the index. With shard=(i, n), only every n-th dandiset starting
    at i is processed, and only shard 0 refreshes dandi.json, so that n
    workers can split the work."""
    shard_index, num_shards = shard
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
    if elapsed > 60 * 60 and shard_index == 0:
        print("Updating dandi.json")
        dandi_data = _load_dandi_data()
        _write_json(dandi_fname, dandi_data)
    else:
        print("Skipping dandi.json update")
        with open(dandi_fname, "r") as f:
            dandi_data = json.load(f)
    dandisets = dandi_data["dandisets"]
    # sort by dandiset id:
    dandisets.sort(key=lambda x: x["dandiset_id"])
    for dandiset in dandisets[shard_index::num_shards]:
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

            _write_json(dandiset_fname, dandiset_data)
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
            vvv2 = "v7.3"
            for nwb_file in dandiset_data["nwb_files"][:200]:
                asset_id = nwb_file["asset_id"]
                asset_fname = f"{dandiset_data_dir}/assets.{vvv}/{asset_id}.json"
                failed_fname = f"{dandiset_data_dir}/assets.{vvv}/{asset_id}.failed.json"
                asset_path = nwb_file["path"]
                need_to_create = True
                if os.path.exists(asset_fname):
                    with open(asset_fname, "r") as f:
                        asset_info = json.load(f)
                    if asset_info.get("dandi_index_asset_version", None) == vvv2:
                        need_to_create = False
                if need_to_create and os.path.exists(failed_fname):
                    with open(failed_fname, "r") as f:
                        failure = json.load(f)
                    if (
                        failure.get("dandi_index_asset_version") == vvv2
                        and time.time() - failure.get("timestamp", 0)
                        < FAILED_ASSET_RETRY_SECONDS
                    ):
                        print(f"{dandiset_id}: Skipping {asset_path}, which failed recently")
                        need_to_create = False
                if need_to_create:
                    print(f"{dandiset_id}: Updating asset info for {asset_path}")
                    if not os.path.exists(f"{dandiset_data_dir}/assets.{vvv}"):
                        os.makedirs(f"{dandiset_data_dir}/assets.{vvv}")
                    try:
                        asset_info = _load_asset_info(
                            dandiset_id=dandiset_id,
                            asset_id=asset_id,
                            dandi_index_asset_version=vvv2,
                        )
                    except Exception as e:
                        # One unreadable file must not stop the update. Record
                        # the failure so it is not retried on every run.
                        print(f"{dandiset_id}: Failed to load asset info for {asset_path}: {e!r}")
                        _write_json(
                            failed_fname,
                            {
                                "dandi_index_asset_version": vvv2,
                                "asset_path": asset_path,
                                "error": repr(e),
                                "timestamp": time.time(),
                            },
                        )
                        continue
                    assert asset_info["dandi_index_asset_version"] == vvv2
                    _write_json(asset_fname, asset_info)
                    if os.path.exists(failed_fname):
                        os.remove(failed_fname)
                else:
                    print(
                        f"{dandiset_id}: Asset info for {asset_path} already up to date"
                    )
                if time.time() - start_time > asset_time_limit:
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
    parser.add_argument(
        "--asset-time-limit",
        type=float,
        default=15,
        help="Seconds to spend on asset updates per dandiset before moving on (default 15)",
    )
    parser.add_argument(
        "--shard",
        default="0/1",
        help="Process only shard i of n dandisets, as i/n, to split the work across workers (default 0/1)",
    )
    args = parser.parse_args()
    shard_index, num_shards = (int(x) for x in args.shard.split("/"))
    if not 0 <= shard_index < num_shards:
        parser.error("--shard must be i/n with 0 <= i < n")
    update_data(
        update_assets=args.assets,
        generate_embeddings=args.embeddings,
        asset_time_limit=args.asset_time_limit,
        shard=(shard_index, num_shards),
    )
