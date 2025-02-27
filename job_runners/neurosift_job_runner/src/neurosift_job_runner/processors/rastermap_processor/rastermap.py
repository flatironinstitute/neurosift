from typing import Any, Dict
import os
import json
import logging
from ...job_utils import update_job_status, InputFile, OutputFile
from .RastermapProcessor import RastermapProcessor, RastermapContext


def process_rastermap_job(job: Dict[str, Any], api_base_url: str | None = None) -> None:
    """Process a rastermap job.

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
        units_path = input_data.get("units_path")
        n_clusters = input_data.get("n_clusters")
        n_PCs = input_data.get("n_PCs")
        locality = input_data.get("locality")
        grid_upsample = input_data.get("grid_upsample")

        input_file = InputFile(name="input", url=nwb_url, file_base_name="file.nwb")
        output_file = OutputFile(
            name="output",
            file_base_name="output.json",
            job_id=job["_id"],
            api_base_url=api_base_url,
        )

        context = RastermapContext(
            input=input_file,
            output=output_file,
            units_path=units_path,
            n_clusters=n_clusters,
            n_PCs=n_PCs,
            locality=locality,
            grid_upsample=grid_upsample,
        )

        update_job_status(job["_id"], {"progress": 10}, **kwargs)
        RastermapProcessor.run(context)
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
