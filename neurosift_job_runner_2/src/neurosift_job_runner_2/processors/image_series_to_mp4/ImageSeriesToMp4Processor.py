import time
import json
import numpy as np
from pydantic import BaseModel, Field
from ...job_utils import InputFile, OutputFile


class ImageSeriesToMp4Context(BaseModel):
    input: InputFile = Field(
        description="Input NWB file in .nwb or .nwb.lindi.tar format"
    )
    output: OutputFile = Field(description="Output data in .mp4 format")
    image_series_path: str = Field(
        description="Path to the image series in the NWB file"
    )
    duration_sec: int = Field(description="Max duration to convert to mp4")


class ImageSeriesToMp4Processor:
    name = "image_series_to_mp4"
    description = "Convert an image series in an NWB file to an MP4 video"
    label = "image_series_to_mp4"
    attributes = {}

    @staticmethod
    def run(context: ImageSeriesToMp4Context):
        import lindi
        from scipy.stats import zscore
        from rastermap import Rastermap

        image_series_path = context.image_series_path
        duration_sec = context.duration_sec

        input_file = context.input
        url = input_file.get_url()
        assert url

        if input_file.file_base_name.endswith(
            ".lindi.json"
        ) or input_file.file_base_name.endswith(".lindi.tar"):
            f = lindi.LindiH5pyFile.from_lindi_file(url)
        else:
            f = lindi.LindiH5pyFile.from_hdf5_file(url)

        group = f[image_series_path]
        assert isinstance(group, lindi.LindiH5pyGroup)
        data = group["data"]
        assert isinstance(data, lindi.LindiH5pyDataset)
        sample_rate: float = _get_sample_rate(group)  # type: ignore
        max_num_frames = int(duration_sec * sample_rate)
        num_frames = min(max_num_frames, data.shape[0])  # type: ignore

        output_fname = "output.mp4"
        data_to_mp4(data, output_fname, sample_rate, num_frames)

        f.close()

        context.output.upload(output_fname)


def data_to_mp4(data, output_fname, sample_rate_hz: float, num_frames: int):
    import cv2

    # get width, height and num_frames
    if data.ndim != 3:
        raise ValueError("Expected a 3D array")
    total_num_frames, height, width = data.shape
    print(f"Array shape: {data.shape}")

    # determine the scale factor
    print("Determining the scale factor")
    first_frames = data[:20]
    max_val = np.percentile(first_frames, 99)
    print(f"99 percentile of first 20 frames: {max_val}")

    # the opencv installed from pip doesn't seem to support avc1 codec
    # so we need to use the conda opencv: conda install -c conda-forge opencv
    # to get it to play on Ubuntu: sudo apt install gstreamer1.0-libav
    fourcc = cv2.VideoWriter_fourcc(*"avc1")  # type: ignore
    fps = sample_rate_hz
    out = cv2.VideoWriter(output_fname, fourcc, fps, (width, height), isColor=False)

    timer = time.time()
    for i in range(num_frames):
        elapsed = time.time() - timer
        if elapsed > 10 or i == 0 or i == num_frames - 1:
            print(f"Writing frame {i + 1}/{num_frames}")
            timer = time.time()
        X = data[i]
        X = X.astype(np.float32) * 255 / max_val
        X = np.clip(X, 0, 255)
        X = X.astype(np.uint8)
        out.write(X)

    out.release()

    print(f"Video saved to {output_fname}")


def _get_sample_rate(group):
    if "starting_time" in group:
        return float(group["starting_time"].attrs["rate"])
    elif "timestamps" in group:
        ts = group["timestamps"][:100]
        diff = np.diff(ts)
        return 1 / np.median(diff)
    else:
        raise ValueError(
            "Cannot determine sample rate because neither timestamps nor start_time is available"
        )
