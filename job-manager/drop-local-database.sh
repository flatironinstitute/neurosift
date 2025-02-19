#!/bin/bash

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if MongoDB container is running
if ! docker ps | grep job-manager-mongodb-1 > /dev/null; then
    echo "MongoDB container is not running. Starting it..."
    docker compose up -d mongodb
fi

echo "Dropping neurosift_jobs database..."
docker exec job-manager-mongodb-1 mongosh --eval "db.getSiblingDB('neurosift_jobs').dropDatabase()"

echo "Database cleared successfully."
