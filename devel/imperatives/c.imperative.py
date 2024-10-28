"""
system hash: 6b908c7178827f8433116bcf83398f82377f2658
// system stu/stu.md

####################################################################################

For each dandiset, prepare a JSON file providing all the neurodata objects by path.

Limit to at most the first 10 nwb files for each dandiset.
Process at most 400 dandisets.

Write your output to a json file called output/neurodata_objects/<DANDISET_ID>.json (create directories of they don't exist) that would look like this:

```json
{
    "files": [
        {
            "dandiset_id": "000000", // the unique identifier of the dandiset
            "dandiset_version": "", // the version of the dandiset
            "file_path": "path/of/file1.nwb",
            "download_url": "https://api.dandiarchive.org/api/assets/00000000-0000-0000-0000-000000000000/download/",
            "neurodata_objects": [
                {
                    "path": "/path/to/neurodata_object1",
                    "neurodata_type": "object_type1"
                },
                ...
            ]
        },
        ...
    ]
}
```

####################################################################################

Print log statements along the way including time executed for each dandiset and the overall time executed. Show the progress throughout by showing how many dandisets have been processed out of the total number of dandisets.

In addition to printing to stdout, print a log to output/neurodata_objects.log with the following information:
* Time executed for each dandiset
* Overall time executed

####################################################################################

Finally prompt the user if they would like to upload the result. If they answer yes "y", do the following:
* Upload the resulting .json files to https://lindi.neurosift.org/tmp/dandi/neurodata_objects/<DANDISET_ID>.json
"""

import stu
import os
import json
import time
from datetime import datetime

def create_directory_if_not_exists(directory_path):
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)

def process_dandisets():
    start_time = time.time()
    log_entries = []
    processed_dandisets_count = 0

    # Get all public dandisets
    dandisets = stu.get_all_public_dandisets()
    total_dandisets = min(len(dandisets), 400)

    for dandiset in dandisets[:total_dandisets]:
        dandiset_start_time = time.time()

        dandiset_data = {
            "files": []
        }

        nwb_files = dandiset.get_nwb_files(limit=10)
        for nwb_file in nwb_files:
            neurodata_objs = nwb_file.get_neurodata_objects()
            neurodata_objects_list = []
            for neurodata_obj in neurodata_objs:
                neurodata_objects_list.append({
                    "path": neurodata_obj.path,
                    "neurodata_type": neurodata_obj.neurodata_type
                })

            file_info = {
                "dandiset_id": dandiset.dandiset_id,
                "dandiset_version": dandiset.dandiset_version,
                "file_path": nwb_file.download_url.split('/')[-1],
                "download_url": nwb_file.download_url,
                "neurodata_objects": neurodata_objects_list
            }
            dandiset_data["files"].append(file_info)

        # Create output JSON file
        create_directory_if_not_exists('output/neurodata_objects/')
        output_file_path = f'output/neurodata_objects/{dandiset.dandiset_id}.json'
        with open(output_file_path, 'w') as json_file:
            json.dump(dandiset_data, json_file, indent=4)

        # Log execution time for current dandiset
        dandiset_end_time = time.time()
        dandiset_execution_time = dandiset_end_time - dandiset_start_time
        log_entry = (
            f"Dandiset {dandiset.dandiset_id} processed. "
            f"Time executed: {dandiset_execution_time:.2f} seconds."
        )
        log_entries.append(log_entry)
        print(log_entry)

        processed_dandisets_count += 1
        if processed_dandisets_count >= 400:
            break

    # Log overall execution time
    end_time = time.time()
    overall_execution_time = end_time - start_time
    overall_log_entry = (
        f"Processed {processed_dandisets_count} dandisets out of {total_dandisets}. "
        f"Overall time executed: {overall_execution_time:.2f} seconds."
    )
    log_entries.append(overall_log_entry)
    print(overall_log_entry)

    with open('output/neurodata_objects.log', 'w') as log_file:
        for entry in log_entries:
            log_file.write(f"{entry}\n")

if __name__ == "__main__":
    # process_dandisets()

    # Prompt user for upload
    upload_response = input("Would you like to upload the result? (y/n): ").lower().strip()
    if upload_response == 'y':
        for root, _, files in os.walk('output/neurodata_objects'):
            for file in files:
                if file.endswith('.json'):
                    file_path = os.path.join(root, file)
                    upload_url = f"https://lindi.neurosift.org/tmp/dandi/neurodata_objects/{file}"
                    stu.upload_file(upload_url, file_path)
                    print(f"Uploaded {file} to {upload_url}")