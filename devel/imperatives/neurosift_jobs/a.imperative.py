"""
system hash: 3a692681d499c321db1b7d2d188000db52ea6497
// system stu/stu.md
// system lou/lou.md

####################################################################################

Prompt the user for a dandiset id, by default use 000946.

For the below, process at most 10 nwb files in the dandiset.

For each nwb file in the dandiset do the following

* For each neurodata object with neurodata type "Units" in the nwb file, submit a multiscale spike sorting job.

Print what you are doing as you go, including printing the paths of the NWB files, and jobs as they are submitted.


"""

import stu
import lou

def main():
    # Prompt the user for a dandiset id, default to 000946
    dandiset_id = input("Enter a dandiset ID (default is 000946): ") or "000946"

    # Get all public dandisets
    dandisets = stu.get_all_public_dandisets()

    # Find the dandiset with the specified ID
    dandiset = next((d for d in dandisets if d.dandiset_id == dandiset_id), None)
    if not dandiset:
        print(f"Dandiset with ID {dandiset_id} not found.")
        return

    # Get a list of nwb files in the dandiset (limit to 10)
    print(f"Processing dandiset {dandiset_id}, version {dandiset.dandiset_version}...")
    nwb_files = dandiset.get_nwb_files(limit=10)

    # Process each nwb file
    for nwb_file in nwb_files:
        print(f"Processing NWB file: {nwb_file.file_path}")

        # Get neurodata objects in the file
        neurodata_objects = nwb_file.get_neurodata_objects()

        for neurodata_object in neurodata_objects:
            # Check if the neurodata object has type "Units"
            if neurodata_object.neurodata_type == "Units":
                # Submit a multiscale spike density job
                print(f"Submitting multiscale spike density job for neurodata object: {neurodata_object.object_path}")

                lou.submit_multiscale_spike_density_job(
                    dandiset_id=dandiset_id,
                    nwb_url=nwb_file.download_url,
                    units_path=neurodata_object.object_path
                )

if __name__ == "__main__":
    main()