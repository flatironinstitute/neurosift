#!/bin/bash

SCRIPT_DIR="$(dirname "$0")"

# Generate build-info.json with current timestamp and version
# Use node for the timestamp: BSD date (macOS) has no %N, so the GNU format
# produced a literal "3N" there and the site showed "Built: Invalid Date".
BUILD_TIME=$(node -p "new Date().toISOString()")
VERSION=$(node -p "require('$SCRIPT_DIR/../package.json').version")
BUILD_INFO="{
  \"buildTime\": \"$BUILD_TIME\",
  \"version\": \"$VERSION\"
}"

# Write to src/build-info.json
echo "$BUILD_INFO" > "$SCRIPT_DIR/../src/build-info.json"

echo "Generated build-info.json (v$VERSION)"
