import json
import dandi.dandiapi as da
import requests
import os

import os
import boto3
import botocore

# Get all dandisets
client = da.DandiAPIClient()
dandisets = [dandiset for dandiset in client.get_dandisets()]

# Set up access to the neurosift bucket
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

overwrite = False
# stop_at_dandiset = '000579'
stop_at_dandiset = None

# go backward through the dandisets
for dandiset in dandisets[::-1]:
    # if dandiset.identifier == '000467': # skip this one
    #     continue
    # if dandiset.identifier in ['000409', '000402', '000233']: # skip these because there are too many large .nwb files: https://dandiarchive.org/dandiset/000409
    #     continue

    print('')
    print('')
    print('')
    print('=======================================')
    print('=======================================')
    print('=======================================')
    print(f'DANDI: {dandiset.identifier} ({dandiset.version_id})')
    asset_num = 0
    for asset in dandiset.get_assets():
        if not asset.path.endswith('.nwb'):
            continue

        asset_num = asset_num + 1
        if asset_num > 50:
            print('Skipping because too many assets')
            break

        if dandiset.identifier == stop_at_dandiset:
            print(f'Stopping at {stop_at_dandiset}')
            exit()

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

        if object_exists('neurosift', f'{neurosift_s3_base_key}/dandi_asset_info.1.json'):
            if not overwrite:
                print('Skipping because already exists')
                continue

        dandi_info = {
            'dandiset_id': asset.dandiset_id,
            'dandiset_version_id': asset.version_id,
            'dandi_asset_id': asset.identifier,
            'dandi_asset_path': asset.path,
            'dandi_asset_size': asset.size,
            'dandi_asset_blob_id': asset.blob
        }
        dandi_info_json = json.dumps(dandi_info, indent=4)

        try:
            # write to temporary file
            tmp_fname = f'/tmp/{asset.identifier}.dandi_asset_info.1.json'
            with open(tmp_fname, 'w') as f:
                f.write(dandi_info_json)
            
            # upload to neurosift bucket
            s3.upload_file(tmp_fname, 'neurosift', f'{neurosift_s3_base_key}/dandi_asset_info.1.json')
        finally:
            # remove temporary file
            os.remove(tmp_fname)