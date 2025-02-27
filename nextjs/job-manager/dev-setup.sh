#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Docker
if ! command_exists docker; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
    echo "Error: Docker Compose plugin is not installed. Please install it first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Start MongoDB
echo "Starting MongoDB with Docker Compose..."
docker compose up -d mongodb

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 5

# Show how to proceed
echo "
Development environment is ready!

To start the services:

1. Start the API server (in a new terminal):
   npm run dev

The following services are now available:
- MongoDB: mongodb://localhost:27017/neurosift_jobs
- API Server: http://localhost:3000/api
"

# Show the API keys
if [ -f .env ]; then
    echo "Your API keys (from .env):"
    grep "API_" .env
fi
