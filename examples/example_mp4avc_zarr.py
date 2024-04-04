import json
import os
import numpy as np
import zarr
import requests
from neurosift.codecs import MP4AVCCodec

MP4AVCCodec.register_codec()


def main():
    zarr_dirname = "example_mp4avc.zarr"
    store = zarr.DirectoryStore(zarr_dirname)
    root = zarr.group(store=store, overwrite=True)
    codec = MP4AVCCodec(fps=24.0)
    video_url = (
        "https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_1MB.mp4"
    )
    video_data = download_video(video_url)
    video_array = codec.decode(video_data)
    chunk_size = 40
    root.create_dataset(
        "video",
        chunks=(chunk_size, video_array.shape[1], video_array.shape[2], video_array.shape[3]),
        compressor=codec,
        shape=video_array.shape,
        dtype=np.uint8
    )
    for i in range(0, video_array.shape[0], chunk_size):
        root["video"][i:i + chunk_size] = video_array[i:i + chunk_size]

    with open(zarr_dirname + "/video/.zarray", "r") as f:
        zarray = json.load(f)
        print(json.dumps(zarray, indent=2))

    total_size_zarr = _compute_total_size_of_dir(zarr_dirname)
    print(f"Total size of Zarr directory (MB): {total_size_zarr / 1024**2}")

    array_for_comparison = root["video"][40:60]
    assert isinstance(array_for_comparison, np.ndarray)
    # because the compression is lossy, the arrays will not be exactly equal
    diff = np.abs(array_for_comparison.astype(np.float64) - video_array[40:60].astype(np.float64))  # type: ignore
    avg_diff = np.mean(diff)
    print(f"Average absolute difference between arrays: {avg_diff:.2f}")
    assert avg_diff < 3


def download_video(url: str) -> bytes:
    response = requests.get(url)
    response.raise_for_status()  # Ensure the download was successful
    return response.content


def _compute_total_size_of_dir(dirname: str) -> int:
    total_size = 0
    for dirpath, _, filenames in os.walk(dirname):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            total_size += os.path.getsize(filepath)
    return total_size


if __name__ == "__main__":
    main()
