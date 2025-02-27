FROM python:3.10-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the package files
COPY pyproject.toml /app/
COPY src /app/src/

# Install the package and its dependencies
RUN pip install --no-cache-dir -e .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Set the entry point to the CLI command
ENTRYPOINT ["neurosift-job-runner"]
