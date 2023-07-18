import time
import numpy as np
import fsspec
import h5py
import requests
import os
from fsspec.implementations.cached import CachingFileSystem
import boto3

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

s3_url = 'https://dandiarchive.s3.amazonaws.com/blobs/368/fa7/368fa71e-4c93-4f7e-af15-06776ca07f34'

print(f'Asset blob URL: {s3_url}')
r = requests.head(s3_url)
etag = r.headers['ETag']
# remove quotes
etag = etag[1:-1]
print(f'ETag: ' + etag)
neurosift_s3_base_key = f'computed/nwb/ETag/{etag[:2]}/{etag[2:4]}/{etag[4:6]}/{etag}'

fs = CachingFileSystem(
    fs=fsspec.filesystem("http"),
    cache_storage="nwb-cache"
)

f = fs.open(s3_url, "rb")
file = h5py.File(f)
print('Getting data object')
x = file['acquisition']['TwoPhotonSeries1']['data']
print(f'Shape of data: {x.shape}')
print(f'Chunking:', x.chunks)
print(f'Compression:', x.compression)
print(f'Compression opts:', x.compression_opts)

chunks = []
N1 = x.shape[0]
M1 = x.chunks[0]
for i in range(0, N1, M1):
    chunks.append({'start': i, 'end': min(i + M1, N1)})

s3_key_parent = f'{neurosift_s3_base_key}/acquisition/TwoPhotonSeries1'
s3_key = f'{s3_key_parent}/data.dat'
os.makedirs(f'/home/magland/Downloads/{s3_key_parent}', exist_ok=True)
fname = f'/home/magland/Downloads/{s3_key}'
with open(fname, 'wb') as output_file:
    for i, ch in enumerate(chunks):
        print(f'Processing chunk {i}/{len(chunks)}')
        timer = time.time()
        chunk0 = x[ch['start']:ch['end'], :, :]
        elapsed = time.time() - timer
        print(f'Elapsed: {elapsed:.3f} sec')
        num_mb_per_sec = chunk0.nbytes / elapsed / 1024 / 1024
        print(f'{num_mb_per_sec} MB/sec')
        print(chunk0.dtype)
        print(chunk0.shape)
        output_file.write(chunk0.tobytes())
    
# upload to neurosift
print('Uploading to neurosift bucket...')
print(s3_key)
s3.upload_file(fname, 'neurosift', f'{s3_key}')