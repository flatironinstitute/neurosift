import os
import json
import time
import urllib.request
from typing import List
import dandi.dandiarchive as da
import lindi


class Dandiset:
    def __init__(self, *, dandiset_id: str, dandiset_version: str, dandiset_url: str):
        self.dandiset_id = dandiset_id
        self.dandiset_version = dandiset_version
        self.dandiset_url = dandiset_url

    def get_nwb_files(self, limit=10):
        return _fetch_nwb_files_for_dandiset(self.dandiset_id, self.dandiset_version, limit=limit)


class NWBFile:
    def __init__(
        self,
        *,
        dandiset_id: str,
        asset_id: str,
        file_path: str,
        size: int,
        download_url: str,
    ):
        self.asset_id = asset_id
        self.dandiset_id = dandiset_id
        self.file_path = file_path
        self.size = size
        self.download_url = download_url

        lindi_file_key = (
            f"dandi/dandisets/{dandiset_id}/assets/{asset_id}/nwb.lindi.json"
        )
        self.lindi_json_url = f"https://lindi.neurosift.org/{lindi_file_key}"

    def get_neurodata_objects(self):
        """Retrieve a list of neurodata objects in the NWB file."""
        local_fname = _download_lindi_json_file(self.lindi_json_url)
        f = lindi.LindiH5pyFile.from_lindi_file(local_fname)
        groups = _get_neurodata_objects_recursively_for_group(f, [])
        return [
            NeurodataObject(
                object_path=group.name,
                neurodata_type=group.attrs.get("neurodata_type", "Unknown"),
                group=group,
            )
            for group in groups
        ]


class NeurodataObject:
    def __init__(self, object_path, neurodata_type, group):
        self.object_path = object_path
        self.neurodata_type = neurodata_type
        self.group = group

    def get_attr(self, key):
        return self.group.attrs[key]


def get_all_public_dandisets():
    url = "https://api.dandiarchive.org/api/dandisets/?page=1&page_size=5000&ordering=-modified&draft=true&empty=false&embargoed=false"
    with urllib.request.urlopen(url) as response:
        X = json.loads(response.read())

    dandisets: List[Dandiset] = []
    for ds in X["results"]:
        pv = ds["most_recent_published_version"]
        dv = ds["draft_version"]
        dandiset_id = ds["identifier"]
        dandisets.append(
            Dandiset(
                dandiset_id=ds["identifier"],
                dandiset_version=pv["version"] if pv else dv["version"],
                dandiset_url=f"https://dandiarchive.org/dandiset/{dandiset_id}",
            )
        )

    return dandisets


def upload_file(url: str, filename: str):
    import boto3

    print(f"Uploading {filename} to {url}")

    if not url.startswith("https://lindi.neurosift.org/tmp/"):
        raise ValueError(f"Invalid URL for uploading text file: {url}")
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        endpoint_url=os.environ["S3_ENDPOINT_URL"],
        region_name="auto",  # for cloudflare
    )
    bucket = "neurosift-lindi"
    object_key = url[len("https://lindi.neurosift.org/"):]
    _upload_file_to_s3(s3, bucket, object_key, filename)


def _fetch_nwb_files_for_dandiset(dandiset_id, dandiset_version, *, limit=10):
    parsed_url = da.parse_dandi_url(
        f"https://dandiarchive.org/dandiset/{dandiset_id}/{dandiset_version}"
    )

    nwb_files = []
    with parsed_url.navigate() as (client, dandiset, assets):
        if dandiset is None:
            print(f"Dandiset {dandiset_id} not found.")
            return []

        num_consecutive_not_nwb = 0
        # important to respect the iterator so we don't pull down all the assets at once
        # and overwhelm the server
        for asset_obj in dandiset.get_assets("path"):
            if not asset_obj.path.endswith(".nwb"):
                num_consecutive_not_nwb += 1
                if num_consecutive_not_nwb >= 20:
                    # For example, this is important for 000026 because there are so many non-nwb assets
                    print(
                        "Skipping dandiset because too many consecutive non-NWB files."
                    )
                    return []
                continue
            else:
                num_consecutive_not_nwb = 0
            download_url = asset_obj.download_url

            # make this canonical, so
            # https://api.dandiarchive.org/api/dandisets/000946/versions/draft/assets/cc0b74c8-1d58-4872-bcad-f8969d115064/download/
            # would be replaced by https://api.dandiarchive.org/api/assets/cc0b74c8-1d58-4872-bcad-f8969d115064/download/
            if download_url.startswith("https://api.dandiarchive.org/api/dandisets/"):
                parts = download_url.split("/")
                download_url = f"https://api.dandiarchive.org/api/assets/{parts[-3]}/download/"

            x = NWBFile(
                dandiset_id=dandiset_id,
                asset_id=asset_obj.identifier,
                size=asset_obj.size,
                file_path=asset_obj.path,
                download_url=download_url,
            )
            nwb_files.append(x)
            if len(nwb_files) >= limit:
                break
    return nwb_files


def _get_neurodata_objects_recursively_for_group(group, visited: list):
    if group.name in visited:
        return []
    visited.append(group.name)
    ret = []
    if "neurodata_type" in group.attrs:
        ret.append(group)
    all_keys = group.keys()
    if len(all_keys) > 20:
        print(
            f"Skipping subgroups of {group.name} because it has too many keys ({len(all_keys)})"
        )
        return ret
    for key in all_keys:
        x = group[key]
        if isinstance(x, lindi.LindiH5pyGroup):
            aa = _get_neurodata_objects_recursively_for_group(x, visited)
            for a in aa:
                ret.append(a)
    return ret


def _download_lindi_json_file(url):
    # url is http://lindi.neurosift.org/dandi/dandisets/000026/assets/1e4b7b7e-0b3b-4b3b-8b3b-0b3b4b3b8b3b/nwb.lindi.json
    # cache this to lindi_cache/dandi/dandisets/000026/assets/1e4b7b7e-0b3b-4b3b-8b3b-0b3b4b3b8b3b/nwb.lindi.json

    if not url.startswith("https://lindi.neurosift.org/"):
        raise ValueError(f"Invalid lindi URL: {url}")
    cache_fname = f'lindi_cache/{url[len("https://lindi.neurosift.org/"):]}'

    if os.path.exists(cache_fname):
        return cache_fname

    # create directories if needed
    os.makedirs(os.path.dirname(cache_fname), exist_ok=True)

    _download_file(url, cache_fname)

    return cache_fname


def _download_file(url, local_fname):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        with open(local_fname + ".downloading", "wb") as f:
            f.write(response.read())

    os.rename(local_fname + ".downloading", local_fname)

    return local_fname


def _upload_file_to_s3(s3, bucket, object_key, fname):
    if fname.endswith(".html"):
        content_type = "text/html"
    elif fname.endswith(".js"):
        content_type = "application/javascript"
    elif fname.endswith(".css"):
        content_type = "text/css"
    elif fname.endswith(".png"):
        content_type = "image/png"
    elif fname.endswith(".jpg"):
        content_type = "image/jpeg"
    elif fname.endswith(".svg"):
        content_type = "image/svg+xml"
    elif fname.endswith(".json"):
        content_type = "application/json"
    elif fname.endswith(".gz"):
        content_type = "application/gzip"
    else:
        content_type = None
    extra_args = {}
    if content_type is not None:
        extra_args["ContentType"] = content_type
    num_retries = 3
    while True:
        try:
            s3.upload_file(fname, bucket, object_key, ExtraArgs=extra_args)
            break
        except Exception as e:
            print(f"Error uploading {object_key} to S3: {e}")
            time.sleep(3)
            num_retries -= 1
            if num_retries == 0:
                raise
