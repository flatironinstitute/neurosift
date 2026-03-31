#!/bin/bash

SCRIPT_DIR="$(dirname "$0")"

# Generate build-info.json with current timestamp and version
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
VERSION=$(node -p "require('$SCRIPT_DIR/../package.json').version")
BUILD_INFO="{
  \"buildTime\": \"$BUILD_TIME\",
  \"version\": \"$VERSION\"
}"

# Write to src/build-info.json
echo "$BUILD_INFO" > "$SCRIPT_DIR/../src/build-info.json"

echo "Generated build-info.json (v$VERSION)"
