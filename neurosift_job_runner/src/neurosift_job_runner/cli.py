#!/usr/bin/env python3

import sys
import logging
from typing import Optional

import click

from .job_utils import get_job, update_job_status
from .processors import (
    process_text_letter_count_job,
    process_rastermap_job,
    process_multiscale_spike_density_job,
)


@click.group()
@click.version_option()
def cli() -> None:
    """Neurosift Job Runner - Command line tool for running Neurosift jobs."""
    pass


@cli.command()
@click.argument("job_id")
@click.option("--api-base-url", help="Base URL for the API", envvar="NEUROSIFT_API_URL")
def run_job(job_id: str, api_base_url: Optional[str] = None) -> None:
    """Run a specific job by ID.

    JOB_ID is the ID of the job to run.
    """
    try:
        # Get job information
        job = get_job(job_id, api_base_url=api_base_url)

        if job["status"] not in ["pending"]:
            click.echo(
                f"Error: Job {job_id} is not pending (status: {job['status']})",
                err=True,
            )
            sys.exit(1)

        click.echo(f"Processing job {job_id} of type {job['type']}")

        # Process job based on type
        handler_map = {
            "text-letter-count": process_text_letter_count_job,
            "rastermap": process_rastermap_job,
            "multiscale_spike_density": process_multiscale_spike_density_job,
        }

        handler = handler_map.get(job["type"])
        if handler:
            handler(job, api_base_url=api_base_url)
        else:
            error_msg = f"Unknown job type: {job['type']}"
            click.echo(f"Error: {error_msg}", err=True)
            update_job_status(
                job_id,
                {"status": "failed", "error": error_msg},
                api_base_url=api_base_url,
            )
            sys.exit(1)

    except Exception as e:
        click.echo(f"Error processing job: {e}", err=True)
        sys.exit(1)


def main() -> None:
    """Entry point for the neurosift-job-runner command-line tool."""
    cli(auto_envvar_prefix="NEUROSIFT")


if __name__ == "__main__":
    main()
