import json
import dandi.dandiapi as da
import requests

import numpy as np
import fsspec
import os
import h5py
from fsspec.implementations.cached import CachingFileSystem

# fs = CachingFileSystem(
#     fs=fsspec.filesystem("http", block_size=100),
#     cache_storage="nwb-cache",  # Local folder for the cache
# )
fs = fsspec.filesystem("http", block_size=1024 * 20) # not sure what is the best block size to use here
client = da.DandiAPIClient()
dandisets = [dandiset for dandiset in client.get_dandisets()]

import os
import boto3
import botocore

CLOUDFLARE_ACCOUNT_ID = os.environ['CLOUDFLARE_ACCOUNT_ID']
CLOUDFLARE_AWS_ACCESS_KEY_ID = os.environ['CLOUDFLARE_AWS_ACCESS_KEY_ID']
CLOUDFLARE_AWS_SECRET_ACCESS_KEY = os.environ['CLOUDFLARE_AWS_SECRET_ACCESS_KEY']

s3 = boto3.client('s3',
  endpoint_url = f'https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com',
  aws_access_key_id = CLOUDFLARE_AWS_ACCESS_KEY_ID,
  aws_secret_access_key = CLOUDFLARE_AWS_SECRET_ACCESS_KEY
)

def object_exists(bucket, key: str):
    try:
        s3.head_object(Bucket=bucket, Key=key)
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == "404":
            return False
        elif e.response['Error']['Code'] == 403:
            raise Exception(f'Access denied to {key}')
        else:
            # Something else has gone wrong.
            raise e
    else:
        return True

# go backward through the dandisets
for dandiset in dandisets[::-1]:
    if dandiset.identifier == '000467': # skip this one
        continue
    if dandiset.identifier in ['000409', '000402', '000233']: # skip these because there are too many large .nwb files: https://dandiarchive.org/dandiset/000409
        continue
    print('')
    print('')
    print('')
    print('=======================================')
    print('=======================================')
    print('=======================================')
    print(f'DANDI: {dandiset.identifier} ({dandiset.version_id})')
    for asset in dandiset.get_assets():
        if not asset.path.endswith('.nwb'):
            continue
        if asset.size < 1024 * 1024 * 1024 * 20:
            continue
        print('=======================================')
        print(f'DANDI: {dandiset.identifier} ({dandiset.version_id})')
        print(asset.path)
        blob = asset.blob
        s3_url = f'https://dandiarchive.s3.amazonaws.com/blobs/{blob[:3]}/{blob[3:6]}/{blob}'
        print(f'Asset blob URL: {s3_url}')
        r = requests.head(s3_url)
        etag = r.headers['ETag']
        # remove quotes
        etag = etag[1:-1]
        print(f'ETag: ' + etag)
        neurosift_s3_base_key = f'computed/nwb/ETag/{etag[:2]}/{etag[2:4]}/{etag[4:6]}/{etag}'

        if object_exists('neurosift', f'{neurosift_s3_base_key}/meta.1.nwb'):
            print('Skipping because already exists')
            continue

        folder = f'/home/magland/Downloads/{neurosift_s3_base_key}'
        os.makedirs(folder, exist_ok=True)

        print('Opening file for lazy reading...')
        f = fs.open(s3_url, "rb")
        file = h5py.File(f)

        def handle_group(grp: h5py.Group, newgrp: h5py.Group):
            for k, v in grp.attrs.items():
                newgrp.attrs[k] = v

            for k, v in grp.items():
                if isinstance(v, h5py.Group):
                    newgrp.create_group(k)
                    handle_group(v, newgrp[k])
                elif isinstance(v, h5py.Dataset):
                    if np.prod(v.shape) <= 100:
                        ds = newgrp.create_dataset(k, data=v[()])
                    else:
                        ds = newgrp.create_dataset(k, shape=v.shape, dtype=v.dtype)
                    for k2, v2 in v.attrs.items():
                        ds.attrs[k2] = v2
        with open(f'{folder}/dandi_asset_info.json', 'w') as f:
            info = {
                'dandiset_id': asset.dandiset_id,
                'dandiset_version_id': asset.version_id,
                'dandi_asset_id': asset.identifier,
                'dandi_asset_path': asset.path,
                'dandi_asset_size': asset.size,
                'dandi_asset_blob_id': asset.blob
            }
            json.dump(info, f, indent=4)
        fname = f'{folder}/meta.1.nwb'
        print(f'Saving to {fname}')
        with h5py.File(fname, 'w') as newfile:
            handle_group(file, newfile)
        print('Uploading to neurosift bucket...')
        s3.upload_file(f'{folder}/meta.1.nwb', 'neurosift', f'{neurosift_s3_base_key}/meta.1.nwb')
        s3.upload_file(f'{folder}/dandi_asset_info.json', 'neurosift', f'{neurosift_s3_base_key}/dandi_asset_info.json')