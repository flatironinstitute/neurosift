#!/usr/bin/env python3

import os
import json
import time
import requests
import lindi
import h5py


def _load_dandi_data():
    url = "https://api.dandiarchive.org/api/dandisets/?page=1&page_size=5000&ordering=-modified&draft=true&empty=false&embargoed=false"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch DANDI data: {response.status_code} {response.reason}"
        )

    data = response.json()
    dandisets = []
    for ds in data["results"]:
        pv = ds.get("most_recent_published_version")
        dv = ds.get("draft_version")
        vv = pv or dv

        if not vv:
            raise Exception(f"No version information for dandiset {ds['identifier']}")

        dandisets.append(
            {
                "dandiset_id": ds["identifier"],
                "version": vv["version"],
                "name": vv["name"],
                "created": vv["created"],
                "modified": vv["modified"],
                "asset_count": vv["asset_count"],
                "size": vv["size"],
                "contact_person": ds.get("contact_person"),
                "embargo_status": ds.get("embargo_status"),
                "star_count": ds.get("star_count", 0),
            }
        )
    return {"dandisets": dandisets, "timestamp": time.time()}


def _load_nwb_files_in_dandiset(dandiset_id, version):
    url = f"https://api.dandiarchive.org/api/dandisets/{dandiset_id}/versions/{version}/assets/?page_size=100&glob=*.nwb"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch NWB files for dandiset {dandiset_id}: {response.status_code} {response.reason}"
        )
    data = response.json()
    nwb_files = []
    for asset in data["results"]:
        nwb_files.append(
            {
                "path": asset["path"],
                "size": asset["size"],
                "asset_id": asset["asset_id"],
            }
        )
    return nwb_files


def _serialize_value(value):
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")
    elif isinstance(value, (list, tuple)):
        return [_serialize_value(v) for v in value]
    elif isinstance(value, dict):
        return _serialize_attributes(value)
    elif isinstance(value, (int, float, str)):
        return value
    else:
        return str(value)  # Fallback for unsupported types


def _serialize_attributes(attrs):
    serialized = {}
    for key, value in attrs.items():
        serialized[key] = _serialize_value(value)
    return serialized


def _load_neurodata_objects_from_group(group: h5py.Group, visited):
    visited[group.name] = True
    neurodata_objects = []
    for name, obj in group.items():
        if isinstance(obj, h5py.Group):
            if obj.attrs.get("neurodata_type", None):
                neurodata_objects.append(
                    {
                        "path": obj.name,
                        "type": obj.attrs["neurodata_type"],
                        "description": obj.attrs.get("description", ""),
                    }
                )
            if not visited.get(obj.name, False):
                neurodata_objects.extend(
                    _load_neurodata_objects_from_group(obj, visited)
                )
    return neurodata_objects


def _load_neurodata_objects(file: h5py.File):
    visited = {}
    return _load_neurodata_objects_from_group(file, visited)


def _load_asset_info(*, dandiset_id: str, asset_id: str):
    url = f"https://api.dandiarchive.org/api/assets/{asset_id}/download/"
    lindi_url = f"https://lindi.neurosift.org/dandi/dandisets/{dandiset_id}/assets/{asset_id}/nwb.lindi.json"
    try:
        f = lindi.LindiH5pyFile.from_lindi_file(lindi_url)
    except:
        print(f"Failed to load Lindi file from {lindi_url}, falling back to HDF5")
        f = lindi.LindiH5pyFile.from_hdf5_file(url)
    neurodata_objects = _load_neurodata_objects(f)
    return {
        "dandiset_id": dandiset_id,
        "asset_id": asset_id,
        "neurodata_objects": neurodata_objects,
        "session_description": _str(f["session_description"][()]),  # type: ignore
        "subject": {
            "age": _str(f["general/subject"]["age"][()]) if "general/subject/age" in f else None,  # type: ignore
            "genotype": _str(f["general/subject"]["genotype"][()]) if "general/subject/genotype" in f else None,  # type: ignore
            "sex": _str(f["general/subject"]["sex"][()]) if "general/subject/sex" in f else None,  # type: ignore
            "species": _str(f["general/subject"]["species"][()]) if "general/subject/species" in f else None,  # type: ignore
            "subject_id": _str(f["general/subject"]["subject_id"][()]) if "general/subject/subject_id" in f else None,  # type: ignore
            "strain": _str(f["general/subject"]["strain"][()]) if "general/subject/strain" in f else None,  # type: ignore
            "specimen_name": _str(f["general/subject"]["specimen_name"][()]) if "f/general/subject/specimen_name" in f else None,  # type: ignore
        },
    }


def _str(value):
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")
    elif isinstance(value, (list, tuple)):
        return [_str(v) for v in value]
    elif isinstance(value, dict):
        return _serialize_attributes(value)
    elif isinstance(value, (int, float, str)):
        return str(value)
    else:
        return str(value)


def _fetch_dandiset_metadata(*, dandiset_id: str, version: str):
    url = (
        f"https://api.dandiarchive.org/api/dandisets/{dandiset_id}/versions/{version}/"
    )
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch metadata for dandiset {dandiset_id}: {response.status_code} {response.reason}"
        )
    data = response.json()
    assert (
        data["id"] == f"DANDI:{dandiset_id}/{version}"
    ), f"Unexpected ID format: {data['id']}"
    return data


def update_data():
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
        for nwb_file in dandiset_data["nwb_files"][:20]:
            asset_id = nwb_file["asset_id"]
            asset_fname = f"{dandiset_data_dir}/assets.{vvv}/{asset_id}.json"
            asset_path = nwb_file["path"]
            if not os.path.exists(asset_fname):
                print(f"{dandiset_id}: Loading asset info for {asset_path}")
                if not os.path.exists(f"{dandiset_data_dir}/assets.{vvv}"):
                    os.makedirs(f"{dandiset_data_dir}/assets.{vvv}")
                asset_info = _load_asset_info(
                    dandiset_id=dandiset_id, asset_id=asset_id
                )
                with open(asset_fname, "w") as f:
                    json.dump(asset_info, f, indent=2)
            else:
                print(f"{dandiset_id}: Asset info for {asset_path} already exists")
            if time.time() - start_time > 15:
                print(f"Time limit reached for dandiset {dandiset_id}, moving to next")
                break


if __name__ == "__main__":
    update_data()
