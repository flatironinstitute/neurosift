"""
system hash: d0920e209aa3e88fa6284c1986a9edafa2595353
// system stu/stu.md

####################################################################################

Make a list of all neurodata types found in all the nwb files in public dandisets on dandi, along with counts for how many times they occur in each dandiset.

Limit to at most the first 10 nwb files for each dandiset.
Process at most 400 dandisets.

Write your output to a json file called output/neurodata_types_with_counts.json (create directory if it doesn't exist) that would look like this:

```json
{
    "neurodata_types": [
        {
            "neurodata_type": "TimeSeries",
            "dandisets": [
                {
                    "dandiset_id": "000000",
                    "count": 5
                },
                ...
            ]
        },
        ...
    ]
}
```

Output should be sorted by neurodata_type.

####################################################################################

Print log statements along the way including time executed for each dandiset and the overall time executed. Show the progress throughout by showing how many dandisets have been processed out of the total number of dandisets.

In addition to printing to stdout, print a log to output/neurodata_types_with_counts.log with the following information:
* Time executed for each dandiset
* Overall time executed

At each iteration, write to the current state of the output to output/neurodata_types_with_counts.tmp.json.

####################################################################################

Create a description file called output/neurodata_types_with_counts_description.md that describes the output file.

The description should go like this:
"This is a json file that contains a list of all neurodata types found in all the nwb files in public dandisets on dandi,
along with counts for how many times they occur in each dandiset."
Then include a schema of the output json file with detailed comments.

####################################################################################

Finally prompt the user if they would like to upload the result. If they answer yes "y", do the following:
* Upload the resulting .json file to https://lindi.neurosift.org/tmp/dandi/neurodata_types_with_counts.json
* Upload the description .txt file to https://lindi.neurosift.org/tmp/dandi/neurodata_types_with_counts_description.md
"""

import os
import json
import time
import stu

# Set up directories
output_dir = 'output'
os.makedirs(output_dir, exist_ok=True)

# Initialize variables
neurodata_types_data = {}
log_file_path = os.path.join(output_dir, 'neurodata_types_with_counts.log')
json_temp_file_path = os.path.join(output_dir, 'neurodata_types_with_counts.tmp.json')
description_file_path = os.path.join(output_dir, 'neurodata_types_with_counts_description.md')
max_dandisets = 400

# Start overall timer
start_time = time.time()

# Helper function to log messages
def log_message(message):
    with open(log_file_path, 'a') as log_file:
        print(message)
        log_file.write(message + '\n')

# Collect data
dandisets = stu.get_all_public_dandisets()[:max_dandisets]
total_dandisets = len(dandisets)

for index, dandiset in enumerate(dandisets):
    dandiset_start_time = time.time()
    
    nwb_files = dandiset.get_nwb_files(limit=10)
    neurodata_count_per_dandiset = {}
    
    for nwb_file in nwb_files:
        neurodata_objects = nwb_file.get_neurodata_objects()
        
        for neurodata_object in neurodata_objects:
            neurodata_type = neurodata_object.neurodata_type
            
            if neurodata_type not in neurodata_count_per_dandiset:
                neurodata_count_per_dandiset[neurodata_type] = 0
            neurodata_count_per_dandiset[neurodata_type] += 1
    
    for neurodata_type, count in neurodata_count_per_dandiset.items():
        if neurodata_type not in neurodata_types_data:
            neurodata_types_data[neurodata_type] = []
        
        neurodata_types_data[neurodata_type].append({
            "dandiset_id": dandiset.dandiset_id,
            "count": count
        })
    
    # Log dandiset processing time
    dandiset_elapsed_time = time.time() - dandiset_start_time
    log_message(f"Processed dandiset {index + 1}/{total_dandisets} (ID: {dandiset.dandiset_id}) in {dandiset_elapsed_time:.2f} seconds.")
    
    # Write current state to temporary json file
    with open(json_temp_file_path, 'w') as tmp_file:
        json.dump({"neurodata_types": [{'neurodata_type': k, 'dandisets': v} for k, v in sorted(neurodata_types_data.items())]}, tmp_file, indent=4)

# Write final output
final_output_file_path = os.path.join(output_dir, 'neurodata_types_with_counts.json')
with open(final_output_file_path, 'w') as output_file:
    json.dump({"neurodata_types": [{'neurodata_type': k, 'dandisets': v} for k, v in sorted(neurodata_types_data.items())]}, output_file, indent=4)

# Log overall execution time
overall_elapsed_time = time.time() - start_time
log_message(f"Overall processing time: {overall_elapsed_time:.2f} seconds.")

# Write description file
description_content = """This is a json file that contains a list of all neurodata types found in all the nwb files in public dandisets on dandi,
along with counts for how many times they occur in each dandiset.

Schema:
{
    "neurodata_types": [
        {
            "neurodata_type": "Type",  # String: The type of the neurodata object
            "dandisets": [              # List: Contains outfobjects related to each dandiset
                {
                    "dandiset_id": "000000",  # String: The 6-digit ID of the dandiset in which this neurodata type occurs
                    "count": 5                # Integer: The number of times this neurodata type appears in the dandiset
                },
                ...
            ]
        },
        ...
    ]
}
"""

with open(description_file_path, 'w') as description_file:
    description_file.write(description_content)

# User prompt for uploading the result
upload = input("Would you like to upload the results? (y/n): ").strip().lower()

if upload == "y":
    stu.upload_file('https://lindi.neurosift.org/tmp/dandi/neurodata_types_with_counts.json', final_output_file_path)
    stu.upload_file('https://lindi.neurosift.org/tmp/dandi/neurodata_types_with_counts_description.md', description_file_path)