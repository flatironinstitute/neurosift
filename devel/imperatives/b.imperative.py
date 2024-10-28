"""
system hash: d0920e209aa3e88fa6284c1986a9edafa2595353
// system stu/stu.md

####################################################################################

Find the colnames for all the Units tables in nwb files in public dandisets on dandi. If a colname occurs more than once in a dandiset, only include it once.

Limit to at most the first 10 nwb files for each dandiset.
Process at most 400 dandisets.

Write your output to a json file called output/units_colnames.json (create directory if it doesn't exist) that would look like this:

```json
{
    "dandisets": [
        {
            "dandiset_id": "000000",
            "colnames": ["colname1", "colname2", ...]
        },
        ...
    ]
}
```

colnames should be in alphabetical order.

####################################################################################

Print log statements along the way including time executed for each dandiset and the overall time executed. Show the progress throughout by showing how many dandisets have been processed out of the total number of dandisets.

In addition to printing to stdout, print a log to output/units_colnames.log with the following information:
* Time executed for each dandiset
* Overall time executed

At each iteration, write to the current state of the output to output/units_colnames.tmp.json.

####################################################################################

Create a description file called output/units_colnames.md that describes the output file.

The description should go like this:
"This is a json file that contains the colnames for all the Units tables in nwb files in public dandisets on dandi."
Then include a schema of the output json file with detailed comments.

####################################################################################

Finally prompt the user if they would like to upload the result. If they answer yes "y", do the following:
* Upload the resulting .json file to https://lindi.neurosift.org/tmp/dandi/units_colnames.json
* Upload the description .txt file to https://lindi.neurosift.org/tmp/dandi/units_colnames.md
"""

import os
import json
import time
from datetime import datetime
import stu

def main():
    # Create output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)

    # Initialize variables
    max_dandisets = 400
    dandisets_processed = 0
    overall_start_time = time.time()
    results = {"dandisets": []}
    log_entries = []

    # Get all public dandisets
    dandisets = stu.get_all_public_dandisets()

    for dandiset in dandisets[:max_dandisets]:
        dandiset_start_time = time.time()

        nwb_files = dandiset.get_nwb_files(limit=10)
        unique_colnames = set()

        for nwb_file in nwb_files:
            neurodata_objects = nwb_file.get_neurodata_objects()

            for neurodata_object in neurodata_objects:
                if neurodata_object.neurodata_type == "Units":
                    colnames = neurodata_object.get_attr("colnames")
                    unique_colnames.update(colnames)

        # Add colnames to results
        results["dandisets"].append({
            "dandiset_id": dandiset.dandiset_id,
            "colnames": sorted(list(unique_colnames))
        })

        dandisets_processed += 1
        dandiset_time_elapsed = time.time() - dandiset_start_time
        log_entry = f"Dandiset {dandiset.dandiset_id} processed in {dandiset_time_elapsed:.2f} seconds."
        log_entries.append(log_entry)
        print(log_entry)
        print(f"Processed {dandisets_processed} out of {max_dandisets} dandisets.")

        # Write temporary results
        with open("output/units_colnames.tmp.json", "w") as tmp_file:
            json.dump(results, tmp_file, indent=4)

    # Overall time execution
    overall_time_elapsed = time.time() - overall_start_time
    overall_log_entry = f"Overall time executed: {overall_time_elapsed:.2f} seconds."
    log_entries.append(overall_log_entry)
    print(overall_log_entry)

    # Write final results
    with open("output/units_colnames.json", "w") as output_file:
        json.dump(results, output_file, indent=4)

    # Write log entries to log file
    with open("output/units_colnames.log", "w") as log_file:
        log_file.write("\n".join(log_entries))

    # Create description markdown file
    description_content = """This is a json file that contains the colnames for all the Units tables in nwb files in public dandisets on dandi.

    Schema:
    {
        "dandisets": [
            {
                "dandiset_id": "000000",  # The unique identifier of the dandiset
                "colnames": ["colname1", "colname2", ...]  # A sorted list of unique colnames in Units tables
            },
            ...
        ]
    }
    """

    with open("output/units_colnames.md", "w") as description_file:
        description_file.write(description_content)

    # Prompt user for upload
    upload_prompt = input("Would you like to upload the result? (y/n): ").strip().lower()
    if upload_prompt == "y":
        stu.upload_file("https://lindi.neurosift.org/tmp/dandi/units_colnames.json", "output/units_colnames.json")
        stu.upload_file("https://lindi.neurosift.org/tmp/dandi/units_colnames.md", "output/units_colnames.md")
        print("Files uploaded successfully.")

if __name__ == "__main__":
    main()