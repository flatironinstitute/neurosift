import h5py
import lindi


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
