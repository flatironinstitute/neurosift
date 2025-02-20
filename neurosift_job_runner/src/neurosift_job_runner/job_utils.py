import os
import requests
import json
import logging
from typing import Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

DEFAULT_API_BASE_URL = os.getenv(
    # "NEUROSIFT_API_BASE_URL", "https://neurosift-job-manager.vercel.app/api"
    "NEUROSIFT_API_BASE_URL",
    "http://localhost:3000/api",
)


def get_upload_urls(
    job_id: str, file_name: str, size: int, api_base_url: Optional[str] = None
) -> Tuple[str, str]:
    """Get upload and download URLs for a job output file.

    Args:
        job_id: ID of the job
        file_name: Name of the file to upload
        size: Size of the file in bytes
        api_base_url: Optional API base URL override

    Returns:
        Tuple of (upload_url, download_url)
    """
    base_url = api_base_url or DEFAULT_API_BASE_URL
    response = requests.post(
        f"{base_url}/jobs/{job_id}/upload-url",
        headers={"Content-Type": "application/json"},
        json={"fileName": file_name, "size": size},
    )

    if not response.ok:
        raise requests.RequestException("Failed to get upload URL")

    result = response.json()
    return result["uploadUrl"], result["downloadUrl"]


def upload_job_output(
    filename: str, job_id: str, api_base_url: Optional[str] = None
) -> str:
    """Upload data to storage and return the URL.

    Args:
        filename: Path to the file to upload
        job_id: ID of the job
        api_base_url: Optional API base URL override

    Returns:
        Download URL for the uploaded data
    """
    with open(filename, "rb") as f:
        data_bytes = f.read()

    file_base_name = os.path.basename(filename)

    return upload_job_output_bytes(
        data_bytes, file_base_name, job_id, api_base_url=api_base_url
    )


def upload_job_output_json(
    data: Any, file_base_name: str, job_id: str, api_base_url: Optional[str] = None
) -> str:
    data_bytes = json.dumps(data).encode("utf-8")
    return upload_job_output_bytes(
        data_bytes, file_base_name, job_id, api_base_url=api_base_url
    )


def upload_job_output_bytes(
    data_bytes: bytes,
    file_base_name: str,
    job_id: str,
    api_base_url: Optional[str] = None,
) -> str:
    size = len(data_bytes)

    upload_url, download_url = get_upload_urls(
        job_id, file_base_name, size, api_base_url=api_base_url
    )

    response = requests.put(
        upload_url, data=data_bytes, headers={"Content-Type": "application/json"}
    )

    if not response.ok:
        raise requests.RequestException("Failed to upload data")

    return download_url


def get_job(job_id: str, api_base_url: str | None = None) -> Dict[str, Any]:
    """Retrieve job information by ID.

    Args:
        job_id: ID of the job to retrieve
        api_base_url: Optional API base URL override

    Returns:
        Job information dictionary
    """
    base_url = api_base_url or DEFAULT_API_BASE_URL
    try:
        response = requests.get(
            f"{base_url}/jobs/{job_id}", headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Error getting job {job_id}: {e}")
        raise


def update_job_status(
    job_id: str, updates: Dict[str, Any], api_base_url: str | None = None
) -> None:
    """Update job status and other fields.

    Args:
        job_id: ID of the job to update
        updates: Dictionary of fields to update
        api_base_url: Optional API base URL override
    """
    base_url = api_base_url or DEFAULT_API_BASE_URL
    try:
        response = requests.patch(
            f"{base_url}/jobs/{job_id}",
            headers={"Content-Type": "application/json"},
            json=updates,
        )
        response.raise_for_status()
    except Exception as e:
        logging.error(f"Error updating job {job_id}: {e}")
        raise


class InputFile(BaseModel):
    name: str
    url: str
    file_base_name: str

    def get_url(self):
        return self.url


class OutputFile(BaseModel):
    name: str
    file_base_name: str
    job_id: str
    api_base_url: Optional[str] = None
    output_url: Optional[str] = None

    def upload(self, fname: str, delete_local_file: bool = True):
        logging.info(f"Uploading output file {fname}")
        kwargs = {"api_base_url": self.api_base_url} if self.api_base_url else {}
        update_job_status(self.job_id, {"progress": 90}, **kwargs)
        self.output_url = upload_job_output(fname, self.job_id, **kwargs)
        if delete_local_file:
            os.remove(fname)
