import dandi.dandiapi as da
import requests

import os

import os
import boto3
import botocore

client = da.DandiAPIClient()
dandisets = [dandiset for dandiset in client.get_dandisets()]

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
    print('')
    print('')
    print('')
    print('=======================================')
    print('=======================================')
    print('=======================================')
    print(f'DANDI: {dandiset.identifier} ({dandiset.version_id})')
    for asset in dandiset.get_assets():
        if not asset.path.endswith('.avi'):
            continue
        
        print('=======================================')
        print(f'DANDI: {dandiset.identifier} ({dandiset.version_id})')
        print(asset.path)
        print(f'Size: {asset.size / 1024 / 1024 :.2f} MB')
        if asset.size > 1024 * 1024 * 500:
            print('Skipping because too large')
            continue
        blob = asset.blob
        s3_url = f'https://dandiarchive.s3.amazonaws.com/blobs/{blob[:3]}/{blob[3:6]}/{blob}'
        print(f'Asset blob URL: {s3_url}')
        r = requests.head(s3_url)
        etag = r.headers['ETag']
        # remove quotes
        etag = etag[1:-1]
        print(f'ETag: ' + etag)
        neurosift_s3_base_key = f'computed/avi/ETag/{etag[:2]}/{etag[2:4]}/{etag[4:6]}/{etag}'

        if object_exists('neurosift', f'{neurosift_s3_base_key}/converted.mp4'):
            print('Skipping because already exists')
            continue
        
        folder = f'/home/magland/Downloads/{neurosift_s3_base_key}'
        os.makedirs(folder, exist_ok=True)

        # download the blob
        print('Downloading blob...')
        blob_path = f'{folder}/blob'
        if not os.path.exists(blob_path):
            os.system(f'curl -o {blob_path} {s3_url}')
        
        # convert to mp4
        print('Converting to mp4...')
        mp4_path = f'{folder}/converted.mp4'
        if not os.path.exists(mp4_path):
            os.system(f'ffmpeg -i {blob_path} {mp4_path}')
        
        # upload to neurosift
        print('Uploading to neurosift bucket...')
        s3.upload_file(f'{folder}/converted.mp4', 'neurosift', f'{neurosift_s3_base_key}/converted.mp4')