"""
system hash: cdfc7b6aeb3b3df4bd8ce09af2638025496d023a
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
            "download_url": "..." // the download url of the file
        },
        ...
    ],
    "objects": [
        {
            "dandiset_id": "000000", // the unique identifier of the dandiset
            "dandiset_version": "", // the version of the dandiset
            "file_path": "path/of/file1.nwb",
            "download_url": "...",
            "object_path": "/path/to/neurodata_object1",
            "neurodata_type": "object_type1"
        },
        ...
    ]
}
```

####################################################################################

Print log statements along the way including time executed for each dandiset and the overall time executed.

Show the progress throughout by printing how many dandisets have been processed out of the total number of dandisets.

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

# Prepare directories
output_dir = 'output/neurodata_objects'
log_file_path = 'output/neurodata_objects.log'
os.makedirs(output_dir, exist_ok=True)

# Open log file
log_file = open(log_file_path, 'w')

# Function to log messages with timestamps
def log_message(message):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    log_entry = f"[{timestamp}] {message}"
    print(log_entry)
    log_file.write(log_entry + "\n")

# Start overall timer
overall_start_time = time.time()

# Get all public dandisets and process at most 400
dandisets = stu.get_all_public_dandisets()
num_dandisets_to_process = min(len(dandisets), 400)

# for index, dandiset in enumerate(dandisets[:num_dandisets_to_process]):
#     dandiset_start_time = time.time()

#     log_message(f"Processing Dandiset {index + 1}/{num_dandisets_to_process} with ID {dandiset.dandiset_id}")

#     # Get the nwb files with a limit of 10
#     nwb_files = dandiset.get_nwb_files(limit=10)

#     # Prepare JSON structure
#     json_data = {
#         "files": [],
#         "objects": []
#     }

#     # Collect information from each nwb file
#     for nwb_file in nwb_files:
#         file_entry = {
#             "dandiset_id": dandiset.dandiset_id,
#             "dandiset_version": dandiset.dandiset_version,
#             "file_path": nwb_file.file_path,
#             "download_url": nwb_file.download_url
#         }
#         json_data["files"].append(file_entry)

#         # Get neurodata objects
#         neurodata_objects = nwb_file.get_neurodata_objects()
#         for neurodata_object in neurodata_objects:
#             object_entry = {
#                 "dandiset_id": dandiset.dandiset_id,
#                 "dandiset_version": dandiset.dandiset_version,
#                 "file_path": nwb_file.file_path,
#                 "download_url": nwb_file.download_url,
#                 "object_path": neurodata_object.object_path,
#                 "neurodata_type": neurodata_object.neurodata_type
#             }
#             json_data["objects"].append(object_entry)

#     # Write data to JSON file
#     output_file_path = os.path.join(output_dir, f"{dandiset.dandiset_id}.json")
#     with open(output_file_path, 'w') as outfile:
#         json.dump(json_data, outfile, indent=4)

#     dandiset_end_time = time.time()
#     log_message(f"Finished processing Dandiset {dandiset.dandiset_id} in {dandiset_end_time - dandiset_start_time:.2f} seconds")

overall_end_time = time.time()
log_message(f"Finished processing all dandisets in {overall_end_time - overall_start_time:.2f} seconds")

# Prompt user if they want to upload the result
user_input = input("Would you like to upload the result? (y/n): ").strip().lower()
if user_input == 'y':
    for dandiset in dandisets[:num_dandisets_to_process]:
        output_file_path = os.path.join(output_dir, f"{dandiset.dandiset_id}.json")
        upload_url = f"https://lindi.neurosift.org/tmp/dandi/neurodata_objects/{dandiset.dandiset_id}.json"
        stu.upload_file(upload_url, output_file_path)
        log_message(f"Uploaded {output_file_path} to {upload_url}")

# Close log file
log_file.close()