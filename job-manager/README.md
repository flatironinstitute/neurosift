# Neurosift Job Manager

A distributed job processing system that allows the Neurosift UI to submit processing jobs that are executed by remote compute clients.

## Local Development Setup

1. Prerequisites:
   - Docker with Docker Compose plugin (not the standalone docker-compose)
   - Node.js and npm
   - Python 3.x

   To install Docker Compose plugin:
   ```bash
   # For Debian/Ubuntu
   sudo apt-get update
   sudo apt-get install docker-compose-plugin

   # For macOS with Homebrew
   brew install docker-compose
   ```

2. Run the development setup script:
   ```bash
   ./dev-setup.sh
   ```
   This script will:
   - Start MongoDB in a Docker container
   - Create a `.env` file
   - Install npm dependencies

3. In a separate terminal, start the service:

   ```bash
   npm run dev
   ```

4. The following services will be available:
   - MongoDB: mongodb://localhost:27017/neurosift_jobs
   - API Server: http://localhost:3000/api

To stop the services:
1. Stop the API server  Ctrl+C in their terminal
2. Stop MongoDB: `docker compose down`

## Running a job

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the compute client:
   ```bash
   ./run-job.py <JOB_ID>
   ```
