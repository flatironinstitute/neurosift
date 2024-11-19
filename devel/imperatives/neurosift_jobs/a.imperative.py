"""
system hash: f1386dd9ad281b6bcd07ed19053fc06e4169dc1e
// system stu/stu.md
// system lou/lou.md

####################################################################################

Prompt the user for a dandiset id, by default use 000946. If the user enters "*" then loop through all dandisets.

For the below, process at most 15 nwb files in the dandiset.

For each nwb file in the dandiset do the following

* For each neurodata object with neurodata type "Units" in the nwb file, submit the following:
    - a multiscale spike sorting job.
    - a rastermap job

* For each neurodata object with neurodata type "OnePhotonSeries" or "TwoPhotonSeries", submit the following
    - an image series to mp4 job with duration of 60 seconds

Print what you are doing as you go, including printing the paths of the NWB files, and jobs as they are submitted.
Whenever printing a log line, also include the dandiset id.


"""

import stu
from lou import submit_multiscale_spike_density_job, submit_rastermap_job, submit_image_series_to_mp4_job

def process_dandiset(dandiset):
    print(f"Processing dandiset {dandiset.dandiset_id}...")

    nwb_files = dandiset.get_nwb_files(limit=15)
    for nwb_file in nwb_files:
        print(f"Dandiset {dandiset.dandiset_id}: Processing NWB file {nwb_file.file_path}...")
        neurodata_objects = nwb_file.get_neurodata_objects()

        for neurodata_object in neurodata_objects:
            object_path = neurodata_object.object_path
            neurodata_type = neurodata_object.neurodata_type

            if neurodata_type == "Units":
                print(f"Dandiset {dandiset.dandiset_id}: Submitting multiscale spike density job for {object_path}...")
                submit_multiscale_spike_density_job(
                    dandiset_id=dandiset.dandiset_id,
                    nwb_url=nwb_file.download_url,
                    units_path=object_path
                )

                print(f"Dandiset {dandiset.dandiset_id}: Submitting rastermap job for {object_path}...")
                submit_rastermap_job(
                    dandiset_id=dandiset.dandiset_id,
                    nwb_url=nwb_file.download_url,
                    units_path=object_path
                )
            elif neurodata_type in ["OnePhotonSeries", "TwoPhotonSeries"]:
                print(f"Dandiset {dandiset.dandiset_id}: Submitting image series to mp4 job for {object_path}...")
                submit_image_series_to_mp4_job(
                    dandiset_id=dandiset.dandiset_id,
                    nwb_url=nwb_file.download_url,
                    path=object_path,
                    duration_sec=60
                )

if __name__ == "__main__":
    user_input = input("Enter a dandiset id (default is '000946'): ").strip()
    if user_input == "":
        user_input = "000946"

    if user_input == "*":
        all_dandisets = stu.get_all_public_dandisets()
        for dandiset in all_dandisets:
            process_dandiset(dandiset)
    else:
        dandiset = stu.get_dandiset_by_id(user_input)
        process_dandiset(dandiset)