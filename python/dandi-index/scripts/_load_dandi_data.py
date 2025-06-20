import time
import requests


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
