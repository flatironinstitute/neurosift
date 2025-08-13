import json
from pydantic import BaseModel, Field
from ...job_utils import OutputFile


class Mountainsort5Context(BaseModel):
    output: OutputFile = Field(description="Output data in .json format")
    zarrUrl: str = Field(description="URL of the Zarr store")
    ecephysPath: str = Field(description="Path to the ecephys data in the Zarr store")
    startTime: float = Field(description="Start time in seconds")
    endTime: float = Field(description="End time in seconds")
    channelString: str = Field(
        description="String of channels to process, e.g. '0,1,2'"
    )
    detectThreshold: float = Field(description="Detection threshold for spikes")


class Mountainsort5Processor:
    name = "mountainsort5"
    description = "Mountainsort5 spike sorting"
    label = "Mountainsort5"
    attributes = {}

    @staticmethod
    def run(context: Mountainsort5Context):
        from .run_mountainsort5 import run_mountainsort5

        output_json = run_mountainsort5(
            zarr_url=context.zarrUrl,
            ecephys_path=context.ecephysPath,
            start_time=context.startTime,
            end_time=context.endTime,
            channels_string=context.channelString,
            detect_threshold=context.detectThreshold,
        )

        with open("_mountainsort5_output.json", "w") as f:
            json.dump(output_json, f)

        context.output.upload("_mountainsort5_output.json", delete_local_file=True)
