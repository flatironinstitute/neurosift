#!/bin/bash

# Generate build-info.json with current timestamp
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
BUILD_INFO="{
  \"buildTime\": \"$BUILD_TIME\"
}"

# Write to src/build-info.json
echo "$BUILD_INFO" > "$(dirname "$0")/../src/build-info.json"

echo "Generated build-info.json"
