import os
import json
import time
import requests
from filelock import FileLock
import fsspec
import h5py
import numpy as np

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

neurosift_nwb_dir = os.environ['RTCSHARE_DIR'] + '/.neurosift-nwb'
pending_req_fname = f'{neurosift_nwb_dir}/pending-requests.jsonl'
queued_req_fname = f'{neurosift_nwb_dir}/queued-requests.jsonl'
finished_req_fname = f'{neurosift_nwb_dir}/finished-requests.jsonl'
error_req_fname = f'{neurosift_nwb_dir}/error-requests.jsonl'


def main():
    while True:
        pending_requests = _read_pending_requests_without_redundancy_and_delete_file()
        with open(queued_req_fname, 'a') as f:
            for req in pending_requests:
                f.write(json.dumps(req) + '\n')
        
        req = _take_first_queued_request()
        if req is not None:
            print('Handling request...')
            print(req)
            timer = time.time()
            try:
                _handle_request(req)
                elapsed_sec = time.time() - timer
                with open(finished_req_fname, 'a') as f:
                    f.write(json.dumps({
                        'time': time.time(),
                        'request': req,
                        'elapsed_sec': elapsed_sec
                    }) + '\n')
            except Exception as e:
                print(f'Error handling request: {e}')
                elapsed_sec = time.time() - timer
                with open(error_req_fname, 'a') as f:
                    f.write(json.dumps({
                        'time': time.time(),
                        'request': req,
                        'error': str(e),
                        'elapsed_sec': elapsed_sec
                    }) + '\n')
        else:
            time.sleep(10)

def _handle_request(req):
    type0 = req['type']
    if type0 == 'request-meta-nwb':
        nwb_url = req['nwbUrl']
        _handle_request_meta_nwb(nwb_url)

def _handle_request_meta_nwb(nwb_url):
    r = requests.head(nwb_url)
    etag = r.headers['ETag']
    # remove quotes
    etag = etag[1:-1]
    print(f'ETag: ' + etag)
    neurosift_s3_base_key = f'computed/nwb/ETag/{etag[:2]}/{etag[2:4]}/{etag[4:6]}/{etag}'

    if object_exists('neurosift', f'{neurosift_s3_base_key}/meta.1.nwb'):
        print('Skipping because already exists')
        return

    staging_folder = f'{neurosift_nwb_dir}/staging/{neurosift_s3_base_key}'
    os.makedirs(staging_folder, exist_ok=True)

    print('Opening file for lazy reading...')
    fs = fsspec.filesystem("http", block_size=1024 * 20) # not sure what is the best block size to use here
    f = fs.open(nwb_url, "rb")
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
    fname = f'{staging_folder}/meta.1.nwb'
    print(f'Saving to {fname}')
    with h5py.File(fname, 'w') as newfile:
        handle_group(file, newfile)
    print('Uploading to neurosift bucket...')
    s3.upload_file(f'{staging_folder}/meta.1.nwb', 'neurosift', f'{neurosift_s3_base_key}/meta.1.nwb')

def _take_first_queued_request():
    if not os.path.exists(queued_req_fname):
        return None
    with open(queued_req_fname, 'r') as f:
        txt = f.read()
    lines = txt.split('\n')
    if len(lines) == 0:
        return None
    first_line = lines[0].strip()
    new_text = '\n'.join(lines[1:])
    with open(queued_req_fname, 'w') as f:
        f.write(new_text)
    if not first_line:
        return None
    return json.loads(first_line)

def _read_pending_requests_without_redundancy_and_delete_file():
    lock_fname = f'{pending_req_fname}.lock'
    lock = FileLock(lock_fname)
    with lock:
        if not os.path.exists(pending_req_fname):
            return []
        pending_request_strings = []
        with open(pending_req_fname, 'r') as f:
            for line in f.readlines():
                a = line.strip()
                if a not in pending_request_strings:
                    pending_request_strings.append(a)
        pending_requests = []
        for line in pending_request_strings:
            pending_requests.append(json.loads(line))
        os.unlink(pending_req_fname)
        return pending_requests

if __name__ == '__main__':
    main()