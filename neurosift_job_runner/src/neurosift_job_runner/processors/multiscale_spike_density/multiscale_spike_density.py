from typing import Any, Dict, Optional
import json
import logging
from ...job_utils import update_job_status, InputFile, OutputFile
from .MultiscaleSpikeDensityProcessor import (
    MultiscaleSpikeDensityProcessor,
    MultiscaleSpikeDensityContext,
)


def process_multiscale_spike_density_job(
    job: Dict[str, Any], api_base_url: Optional[str] = None
):
    """Process a multiscale spike density job.

    Args:
        job: The job dictionary containing job information and input
        api_base_url: Optional API base URL override
    """
    kwargs = {"api_base_url": api_base_url} if api_base_url else {}

    try:
        update_job_status(job["_id"], {"status": "running", "progress": 5}, **kwargs)

        # Get input parameters
        input_data: dict = json.loads(job["input"])
        nwb_url: str = input_data.get("nwb_url")  # type: ignore
        units_path: str = input_data.get("units_path")  # type: ignore
        bin_size_msec = input_data.get("bin_size_msec", 20)

        input_file = InputFile(name="input", url=nwb_url, file_base_name="file.nwb")
        output_file = OutputFile(
            name="output",
            file_base_name="output.lindi.tar",
            job_id=job["_id"],
            api_base_url=api_base_url,
        )

        context = MultiscaleSpikeDensityContext(
            input=input_file,
            output=output_file,
            units_path=units_path,
            bin_size_msec=bin_size_msec,
        )

        update_job_status(job["_id"], {"progress": 10}, **kwargs)
        MultiscaleSpikeDensityProcessor.run(context)

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
        import traceback

        traceback.print_exc()
        logging.error(f"Error processing job {job['_id']}: {e}")
        update_job_status(job["_id"], {"status": "failed", "error": str(e)}, **kwargs)
        raise
