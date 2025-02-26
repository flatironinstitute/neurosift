from typing import Any, Dict
import json
import logging
from ...job_utils import update_job_status, InputFile, OutputFile
from .ImageSeriesToMp4Processor import (
    ImageSeriesToMp4Processor,
    ImageSeriesToMp4Context,
)


def process_image_series_to_mp4_job(
    job: Dict[str, Any], api_base_url: str | None = None
) -> None:
    """Process a image_series_to_mp4 job.

    Args:
        job: The job dictionary containing job information and input
        api_base_url: Optional API base URL override
    """
    kwargs = {"api_base_url": api_base_url} if api_base_url else {}

    try:
        update_job_status(job["_id"], {"status": "running", "progress": 5}, **kwargs)

        # Get input parameters
        input_data = json.loads(job["input"])
        nwb_url = input_data.get("nwb_url")
        image_series_path = input_data.get("image_series_path")
        duration_sec = input_data.get("duration_sec")

        input_file = InputFile(name="input", url=nwb_url, file_base_name="file.nwb")
        output_file = OutputFile(
            name="output",
            file_base_name="output.mp4",
            job_id=job["_id"],
            api_base_url=api_base_url,
        )

        context = ImageSeriesToMp4Context(
            input=input_file,
            output=output_file,
            image_series_path=image_series_path,
            duration_sec=duration_sec,
        )

        update_job_status(job["_id"], {"progress": 10}, **kwargs)
        ImageSeriesToMp4Processor.run(context)
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
