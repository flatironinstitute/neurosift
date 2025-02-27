from typing import Any, Dict
import requests
import json
import logging
from ...job_utils import update_job_status, upload_job_output_json


def process_text_letter_count_job(
    job: Dict[str, Any], api_base_url: str | None = None
) -> None:
    """Process a text-letter-count job.

    Args:
        job: The job dictionary containing job information and input
        api_base_url: Optional API base URL override
    """
    kwargs = {"api_base_url": api_base_url} if api_base_url else {}

    try:
        # Get input parameters
        input_data = json.loads(job["input"])
        file_url = input_data.get("fileUrl")
        if not file_url:
            raise ValueError("fileUrl is required")

        # Download the file
        response = requests.get(file_url)
        response.raise_for_status()
        text = response.text

        # Update progress
        update_job_status(job["_id"], {"status": "running", "progress": 25}, **kwargs)
        logging.info("Downloaded file and started processing")

        # Compute letter counts
        letter_counts = {}
        for char in text:
            if char.isalpha():
                letter_counts[char.lower()] = letter_counts.get(char.lower(), 0) + 1

        # Sort by frequency
        sorted_counts = dict(sorted(letter_counts.items(), key=lambda x: (-x[1], x[0])))

        # Update progress
        update_job_status(job["_id"], {"progress": 75}, **kwargs)
        logging.info("Computed letter counts")

        # Upload results
        result = {
            "letterCounts": sorted_counts,
            "totalLetters": sum(sorted_counts.values()),
        }
        output_url = upload_job_output_json(result, "result.json", job["_id"], **kwargs)
        logging.info("Uploaded results")

        # Complete the job
        update_job_status(
            job["_id"],
            {
                "status": "completed",
                "progress": 100,
                "output": json.dumps({"outputUrl": output_url}),
            },
            **kwargs,
        )
        logging.info("Job completed successfully")

    except Exception as e:
        logging.error(f"Error processing job {job['_id']}: {e}")
        update_job_status(job["_id"], {"status": "failed", "error": str(e)}, **kwargs)
        raise
