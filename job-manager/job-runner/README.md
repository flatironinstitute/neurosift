# Neurosift Job Runner

Docker container for running Neurosift jobs. This container handles job processing for various job types supported by the Neurosift job manager.

## Usage

To run a job, you need to have Docker installed and then execute:

```bash
docker pull ghcr.io/flatironinstitute/neurosift-job-runner
docker run ghcr.io/flatironinstitute/neurosift-job-runner <job-id>
```

The container will:
1. Fetch the job details from the Neurosift job manager API
2. Process the job according to its type
3. Upload the results
4. Update the job status

## Environment Variables

- `API_BASE_URL`: Base URL for the job manager API (defaults to https://neurosift-job-manager.vercel.app/api)

## Development

To build the Docker image locally:

```bash
cd job-manager/job-runner
docker build -t ghcr.io/flatironinstitute/neurosift-job-runner .
