#!/usr/bin/env python3

import os
import sys
import requests
import json
import argparse
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000/api")
# API_BASE_URL = os.getenv("API_BASE_URL", "https://neurosift-job-manager.vercel.app/api")


def get_upload_urls(job_id: str, file_name: str, size: int) -> tuple[str, str]:
    """Get upload and download URLs for a job output file."""
    response = requests.post(
        f"{API_BASE_URL}/jobs/{job_id}/upload-url",
        headers=get_headers(),
        json={"fileName": file_name, "size": size},
    )

    if not response.ok:
        raise requests.RequestException("Failed to get upload URL")

    result = response.json()
    return result["uploadUrl"], result["downloadUrl"]


def upload_to_memobin(data: Dict[str, Any], job_id: str, file_base_name: str) -> str:
    """Upload data to memobin and return the URL."""
    data_bytes = json.dumps(data).encode("utf-8")
    size = len(data_bytes)

    upload_url, download_url = get_upload_urls(job_id, file_base_name, size)

    response = requests.put(
        upload_url, data=data_bytes, headers={"Content-Type": "application/json"}
    )

    if not response.ok:
        raise requests.RequestException("Failed to upload data to memobin")

    return download_url


def get_headers():
    return {"Content-Type": "application/json"}


def get_job(job_id: str) -> Dict[str, Any]:
    """Retrieve job information by ID."""
    try:
        response = requests.get(f"{API_BASE_URL}/jobs/{job_id}", headers=get_headers())
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Error getting job {job_id}: {e}")
        raise


def update_job_status(job_id: str, updates: Dict[str, Any]):
    """Update job status and other fields."""
    try:
        response = requests.patch(
            f"{API_BASE_URL}/jobs/{job_id}", headers=get_headers(), json=updates
        )
        response.raise_for_status()
    except Exception as e:
        logging.error(f"Error updating job {job_id}: {e}")
        raise


def process_text_letter_count_job(job: Dict[str, Any]):
    """Process a text-letter-count job."""
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
        update_job_status(job["_id"], {"status": "running", "progress": 25})
        logging.info("Downloaded file and started processing")

        # Compute letter counts
        letter_counts = {}
        for char in text:
            if char.isalpha():
                letter_counts[char.lower()] = letter_counts.get(char.lower(), 0) + 1

        # Sort by frequency
        sorted_counts = dict(sorted(letter_counts.items(), key=lambda x: (-x[1], x[0])))

        # Update progress
        update_job_status(job["_id"], {"progress": 75})
        logging.info("Computed letter counts")

        # Upload results to memobin
        result = {
            "letterCounts": sorted_counts,
            "totalLetters": sum(sorted_counts.values()),
        }
        memobin_url = upload_to_memobin(result, job["_id"], "result.json")
        logging.info("Uploaded results to memobin")

        # Complete the job
        update_job_status(
            job["_id"],
            {
                "status": "completed",
                "progress": 100,
                "output": json.dumps({"outputUrl": memobin_url}),
            },
        )
        logging.info("Job completed successfully")

    except Exception as e:
        logging.error(f"Error processing job {job['_id']}: {e}")
        update_job_status(job["_id"], {"status": "failed", "error": str(e)})
        raise


def main():
    parser = argparse.ArgumentParser(description="Run a specific job by ID")
    parser.add_argument("job_id", help="The ID of the job to run")
    args = parser.parse_args()

    try:
        # Get job information
        job = get_job(args.job_id)

        if job["status"] not in ["pending"]:
            logging.error(f"Job {args.job_id} is not pending (status: {job['status']})")
            sys.exit(1)

        logging.info(f"Processing job {args.job_id} of type {job['type']}")

        # Process job based on type
        if job["type"] == "text-letter-count":
            process_text_letter_count_job(job)
        else:
            error_msg = f"Unknown job type: {job['type']}"
            logging.error(error_msg)
            update_job_status(args.job_id, {"status": "failed", "error": error_msg})
            sys.exit(1)

    except Exception as e:
        logging.error(f"Error processing job: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
