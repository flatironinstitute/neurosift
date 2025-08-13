import os
from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

import time
import numpy as np

import zarr
import zarr
import fsspec
import aiohttp

import spikeinterface.extractors as se
import spikeinterface.preprocessing as spre
import mountainsort5 as ms5

# Segment size in bytes (amount of data to load in memory at once)
SEGMENT_SIZE_BYTES = 60 * 1024 * 1024


def get_zarr_store(zarr_url: str):
    t = aiohttp.ClientTimeout(total=10)
    mapper = fsspec.get_mapper(
        zarr_url,
        check=False,
        client_kwargs={"timeout": t},
    )
    return mapper


def get_dataset_info(store, electrical_series_path: str) -> Dict[str, Any]:
    """Get information about the dataset structure."""
    root = zarr.group(store=store)
    obj_grp = root[electrical_series_path]
    tiles_grp = obj_grp["ecephys_tiles"]

    # Get level_0 dataset info
    level_0_data = tiles_grp["level_0/data"]

    info = {
        "shape": level_0_data.shape,
        "chunks": level_0_data.chunks,
        "dtype": str(level_0_data.dtype),
        "sampling_frequency": float(tiles_grp.attrs["sampling_frequency"]),
        "num_samples": int(tiles_grp.attrs["num_samples"]),
        "num_channels": int(tiles_grp.attrs["num_channels"]),
        "downsampling_factor": int(level_0_data.attrs["downsampling_factor"]),
        "channel_ids": tiles_grp.attrs["channel_ids"],
        "channel_locations": tiles_grp.attrs["channel_locations"],
    }

    return info


def load_segment(
    *, dataset: zarr.Array, start_sample: int, end_sample: int, max_workers: int
) -> np.ndarray:
    chunks = dataset.chunks
    shape = dataset.shape
    dtype = dataset.dtype
    nsamp = end_sample - start_sample

    ret = np.empty((nsamp, shape[1]), dtype=dtype)

    # Prepare chunk index list
    indices = []
    for i in range(start_sample, end_sample, chunks[0]):
        ci = i // chunks[0]
        for j in range(0, shape[1], chunks[1]):
            cj = j // chunks[1]
            indices.append((ci, cj))

    # Retry-safe block fetcher
    def fetch_block(ci, cj, *, _retries=10):
        s0 = ci * chunks[0]
        e0 = min(s0 + chunks[0], shape[0])
        s1 = cj * chunks[1]
        e1 = min(s1 + chunks[1], shape[1])
        for attempt in range(_retries):
            try:
                arr = dataset[s0:e0, s1:e1]
                return (s0, e0, s1, e1, arr)
            except Exception as ex:
                if attempt == _retries - 1:
                    raise
                print(f"Error fetching chunk ({ci}, {cj}): {ex}. Retrying...")
                time.sleep(0.5 * (attempt + 1))  # backoff

    # Launch in parallel and gather results
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futures = {ex.submit(fetch_block, ci, cj): (ci, cj) for ci, cj in indices}
        for fut in as_completed(futures, timeout=300):  # global safety timeout
            s0, e0, s1, e1, arr = fut.result(timeout=60)  # per-chunk timeout
            ret[s0 - start_sample : e0 - start_sample, s1:e1] = arr

    return ret


def run_mountainsort5(
    *,
    zarr_url: str,
    ecephys_path: str,
    start_time: float,
    end_time: float,
    channels_string: str,
    detect_threshold: float,
):
    if channels_string != "*":
        raise ValueError("Mountainsort5 processor only supports '*' for channel_string")
    detect_channel_radius = 100
    npca_per_channel = 1
    zarr_store = get_zarr_store(zarr_url)
    print("Loading dataset info")
    dataset_info = get_dataset_info(zarr_store, ecephys_path)

    print("Dataset Information:")
    for key, value in dataset_info.items():
        print(f"{key}: {value}")

    chunks = dataset_info["chunks"]
    dtype = dataset_info["dtype"]
    shape = dataset_info["shape"]
    sampling_frequency = dataset_info["sampling_frequency"]
    channel_ids = dataset_info["channel_ids"]
    channel_locations = dataset_info["channel_locations"]
    assert dtype == "int16", "Expected dtype to be int16"

    root = zarr.group(store=zarr_store)
    obj_grp = root[ecephys_path]
    tiles_grp = obj_grp["ecephys_tiles"]

    level_0_data = tiles_grp["level_0/data"]

    # Calculate how many samples to load based on total samples available
    start_sample = int(start_time * sampling_frequency)
    end_sample = int(end_time * sampling_frequency)
    start_sample = (start_sample // chunks[0]) * chunks[
        0
    ]  # Round down to nearest chunk size
    end_sample = (end_sample // chunks[0]) * chunks[
        0
    ]  # Round down to nearest chunk size

    total_samples = end_sample - start_sample

    num_channels = shape[1]
    bytes_per_sample = np.dtype(dtype).itemsize * num_channels

    # Calculate segment size in samples
    segment_size_samples = SEGMENT_SIZE_BYTES // bytes_per_sample
    # Round down to nearest multiple of chunk size for efficiency
    segment_size_samples = (segment_size_samples // chunks[0]) * chunks[0]

    print(f"Total samples to load: {total_samples}")
    print(
        f"Segment size: {segment_size_samples} samples ({segment_size_samples * bytes_per_sample / (1024*1024):.1f} MB)"
    )
    print(
        f"Number of segments: {(total_samples + segment_size_samples - 1) // segment_size_samples}"
    )

    # Open binary file for writing
    output_file = "_mountainsort5_recording.dat"
    if os.path.exists(output_file):
        os.remove(output_file)  # Remove existing file if it exists
    total_start_time = time.time()
    total_bytes_written = 0

    with open(output_file, "wb") as f:
        current_sample = start_sample
        segment_num = 1

        while current_sample < end_sample:
            # Calculate end sample for this segment
            current_sample_end = min(current_sample + segment_size_samples, end_sample)

            print(
                f"\nSegment {segment_num}: Loading samples {current_sample} to {current_sample_end}"
            )

            # Load segment
            segment_start_time = time.time()
            data = load_segment(
                dataset=level_0_data,
                start_sample=current_sample,
                end_sample=current_sample_end,
                max_workers=12,
            )
            segment_load_time = time.time() - segment_start_time

            # Write segment to binary file
            write_start_time = time.time()
            data_bytes = data.astype(dtype).tobytes()
            f.write(data_bytes)
            write_time = time.time() - write_start_time

            # Calculate and report statistics
            segment_bytes = len(data_bytes)
            total_bytes_written += segment_bytes
            segment_total_time = time.time() - segment_start_time

            load_throughput = segment_bytes / segment_load_time / (1024 * 1024)  # MB/s
            write_throughput = segment_bytes / write_time / (1024 * 1024)  # MB/s
            total_throughput = (
                segment_bytes / segment_total_time / (1024 * 1024)
            )  # MB/s

            print(f"  Loaded in {segment_load_time:.2f}s ({load_throughput:.1f} MB/s)")
            print(f"  Written in {write_time:.2f}s ({write_throughput:.1f} MB/s)")
            print(
                f"  Total segment time: {segment_total_time:.2f}s ({total_throughput:.1f} MB/s)"
            )
            print(f"  Segment size: {segment_bytes / (1024*1024):.1f} MB")
            print(f"  Data shape: {data.shape}")

            # Update progress
            progress = (
                (current_sample - start_sample + data.shape[0]) / total_samples * 100
            )
            print(
                f"  Progress: {progress:.1f}% ({current_sample - start_sample + data.shape[0]}/{total_samples} samples)"
            )

            current_sample = current_sample_end
            segment_num += 1

    # Final statistics
    total_time = time.time() - total_start_time
    overall_throughput = total_bytes_written / total_time / (1024 * 1024)

    print(f"\n=== FINAL STATISTICS ===")
    print(f"Output file: {output_file}")
    print(f"Total samples written: {total_samples}")
    print(f"Total bytes written: {total_bytes_written / (1024*1024):.1f} MB")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Overall throughput: {overall_throughput:.1f} MB/s")
    print(f"File size: {total_bytes_written} bytes")

    R = se.BinaryRecordingExtractor(
        output_file,
        sampling_frequency=sampling_frequency,
        dtype="int16",
        num_channels=shape[1],
        channel_ids=channel_ids,
    )
    R.set_channel_locations(channel_locations)
    recording = spre.WhitenRecording(R, dtype="float32")

    sorting = ms5.sorting_scheme1(
        recording,
        sorting_parameters=ms5.Scheme1SortingParameters(
            detect_threshold=detect_threshold,
            detect_channel_radius=detect_channel_radius,
            npca_per_channel=npca_per_channel,
        ),
    )
    unit_ids = sorting.get_unit_ids()
    for unit_id in unit_ids:
        st = sorting.get_unit_spike_train(unit_id)
        print(f"Unit {unit_id}: {len(st)} spikes")

    output_json = {"units": []}
    time_offset = start_sample * sampling_frequency
    for unit_id in unit_ids:
        st = sorting.get_unit_spike_train(unit_id)
        st = [float(s) + time_offset for s in st.tolist()]
        st = [t for t in st if start_time <= t / sampling_frequency < end_time]
        output_json["units"].append({"id": str(unit_id), "spike_train": st})
    return output_json
