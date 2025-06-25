import h5py
import lindi


def _load_neurodata_objects_from_group(group: h5py.Group, visited, dandiset_id: str):
    visited[group.name] = True
    neurodata_objects = []
    for name, obj in group.items():
        if isinstance(obj, h5py.Group):
            if obj.attrs.get("neurodata_type", None):
                x = {
                    "path": obj.name,
                    "type": obj.attrs["neurodata_type"],
                    "description": obj.attrs.get("description", ""),
                }
                try:
                    new_fields = _handle_timeseries(obj)
                    x = {**x, **new_fields}
                except Exception as e:
                    msg = f"Error handling timeseries for {obj.name}: {e}"
                    _write_message_to_log(msg, dandiset_id=dandiset_id)
                    print(msg)
                try:
                    new_fields = _handle_table(obj)
                    x = {**x, **new_fields}
                except Exception as e:
                    msg = f"Error handling table for {obj.name}: {e}"
                    _write_message_to_log(msg, dandiset_id=dandiset_id)
                    print(msg)
                neurodata_objects.append(x)
            if not visited.get(obj.name, False):
                neurodata_objects.extend(
                    _load_neurodata_objects_from_group(
                        obj, visited, dandiset_id=dandiset_id
                    )
                )
    return neurodata_objects


def _write_message_to_log(message: str, *, dandiset_id: str):
    with open(f"dandi-index-warnings.txt", "a") as f:
        f.write(f"[DANDISET {dandiset_id}] {message}\n")


def _handle_timeseries(obj: h5py.Group):
    if "data" in obj and "timestamps" in obj:
        timestamps = obj["timestamps"]
        if not isinstance(timestamps, h5py.Dataset):
            return {}
        data = obj["data"]
        if not isinstance(data, h5py.Dataset):
            return {}
        t1 = timestamps[0] if len(timestamps) > 0 else None
        t2 = timestamps[-1] if len(timestamps) > 0 else None
        if t1 is None or t2 is None:
            return {}
        # if t1 or t2 are NaN, then return
        if isinstance(t1, float) and (t1 != t1):
            return {}
        if isinstance(t2, float) and (t2 != t2):
            return {}
        start_time = t1
        duration = t2 - t1
        shape = [int(a) for a in data.shape]
        sampling_rate = _get_sampling_rate_from_timestamps(timestamps[:100])
        return {
            "start_time": float(start_time),
            "duration": float(duration),
            "shape": shape,
            "sampling_rate": sampling_rate,
        }
    elif "data" in obj and "starting_time" in obj:
        data = obj["data"]
        if not isinstance(data, h5py.Dataset):
            return {}
        starting_time = obj["starting_time"]
        if not isinstance(starting_time, h5py.Dataset):
            return {}
        sampling_rate = obj.attrs.get("sampling_rate", None)
        if sampling_rate is None:
            return {}
        shape = [int(a) for a in data.shape]
        num_samples = shape[0] if len(shape) > 0 else 0
        duration = num_samples / sampling_rate if sampling_rate > 0 else 0
        return {
            "start_time": float(starting_time[()]),
            "duration": float(duration),
            "shape": shape,
            "sampling_rate": float(sampling_rate),
        }
    else:
        return {}


def _get_sampling_rate_from_timestamps(timestamps):
    if len(timestamps) < 2:
        return None
    diffs = [t2 - t1 for t1, t2 in zip(timestamps[:-1], timestamps[1:])]
    median_diff = sorted(diffs)[len(diffs) // 2]
    if median_diff > 0:
        return 1.0 / median_diff
    return None


def _handle_table(obj: h5py.Group):
    colnames = obj.attrs.get("colnames", None)
    if colnames is not None:
        return {"colnames": [_str(c) for c in colnames]}
    else:
        return {}


def _load_neurodata_objects(file: h5py.File, dandiset_id: str):
    visited = {}
    return _load_neurodata_objects_from_group(file, visited, dandiset_id=dandiset_id)


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


def _load_asset_info(
    *, dandiset_id: str, asset_id: str, dandi_index_asset_version: str
):
    assert dandi_index_asset_version == "v7.2"
    url = f"https://api.dandiarchive.org/api/assets/{asset_id}/download/"
    lindi_url = f"https://lindi.neurosift.org/dandi/dandisets/{dandiset_id}/assets/{asset_id}/nwb.lindi.json"
    try:
        f = lindi.LindiH5pyFile.from_lindi_file(lindi_url)
    except:
        print(f"Failed to load Lindi file from {lindi_url}, falling back to HDF5")
        f = lindi.LindiH5pyFile.from_hdf5_file(url)
    neurodata_objects = _load_neurodata_objects(f, dandiset_id=dandiset_id)
    return {
        "dandi_index_asset_version": dandi_index_asset_version,
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
