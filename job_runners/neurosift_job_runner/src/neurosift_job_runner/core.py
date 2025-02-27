from typing import Optional
import logging
import sys

from .job_utils import get_job, update_job_status


# Lazy imports for job processors to avoid loading all dependencies upfront
def get_job_processor(job_type: str):
    """Dynamically import and return the appropriate job processor."""
    if job_type == "text-letter-count":
        from .processors.text_letter_count import process_text_letter_count_job

        return process_text_letter_count_job
    elif job_type == "rastermap":
        from .processors.rastermap_processor import process_rastermap_job

        return process_rastermap_job
    elif job_type == "multiscale_spike_density":
        from .processors.multiscale_spike_density import (
            process_multiscale_spike_density_job,
        )

        return process_multiscale_spike_density_job
    else:
        raise ValueError(f"Unknown job type: {job_type}")


def process_job(job_id: str, api_base_url: Optional[str] = None) -> None:
    """Process a job by its ID.

    Args:
        job_id: The ID of the job to process
        api_base_url: Optional base URL for the API

    Raises:
        SystemExit: If job processing fails
    """
    try:
        # Get job information
        kwargs = {}
        if api_base_url:
            kwargs["api_base_url"] = api_base_url
        job = get_job(job_id, **kwargs)

        if job["status"] not in ["pending"]:
            error_msg = f"Job {job_id} is not pending (status: {job['status']})"
            logging.error(error_msg)
            sys.exit(1)

        logging.info(f"Processing job {job_id} of type {job['type']}")

        try:
            # Get the appropriate processor for this job type
            process_func = get_job_processor(job["type"])
            # Process the job
            process_func(job, **kwargs)
        except ImportError as e:
            error_msg = f"Failed to import processor for job type {job['type']}: {e}"
            logging.error(error_msg)
            update_job_status(
                job_id, {"status": "failed", "error": error_msg}, **kwargs
            )
            sys.exit(1)
        except Exception as e:
            error_msg = f"Error processing job: {e}"
            logging.error(error_msg)
            update_job_status(job_id, {"status": "failed", "error": str(e)}, **kwargs)
            sys.exit(1)

    except Exception as e:
        logging.error(f"Error processing job: {e}")
        sys.exit(1)
