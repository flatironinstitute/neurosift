from typing import Any, Dict
import json
import logging
from ...job_utils import update_job_status, OutputFile
from .Mountainsort5Processor import (
    Mountainsort5Processor,
    Mountainsort5Context,
)


def process_mountainsort5_job(
    job: Dict[str, Any], api_base_url: str | None = None
) -> None:
    """Process a mountainsort5 job.

    Args:
        job: The job dictionary containing job information and input
        api_base_url: Optional API base URL override
    """
    kwargs = {"api_base_url": api_base_url} if api_base_url else {}

    try:
        update_job_status(job["_id"], {"status": "running", "progress": 5}, **kwargs)

        # Get input parameters
        input_data = json.loads(job["input"])
        zarr_url = input_data.get("zarrUrl")
        ecephys_path = input_data.get("ecephysPath")
        start_time = input_data.get("startTime")
        end_time = input_data.get("endTime")
        detect_threshold = input_data.get("detectThreshold")
        channel_string = input_data.get("channelString")

        output_file = OutputFile(
            name="output",
            file_base_name="output.json",
            job_id=job["_id"],
            api_base_url=api_base_url,
        )

        context = Mountainsort5Context(
            output=output_file,
            zarrUrl=zarr_url,
            ecephysPath=ecephys_path,
            startTime=start_time,
            endTime=end_time,
            detectThreshold=detect_threshold,
            channelString=channel_string,
        )

        update_job_status(job["_id"], {"progress": 10}, **kwargs)
        Mountainsort5Processor.run(context)
        update_job_status(
            job["_id"],
            {
                "progress": 100,
                "status": "completed",
                "output": json.dumps({"output_url": output_file.output_url}),
            },
            **kwargs,
        )

        logging.info("Job completed successfully")

    except Exception as e:
        logging.error(f"Error processing job {job['_id']}: {e}")
        update_job_status(job["_id"], {"status": "failed", "error": str(e)}, **kwargs)
        raise
