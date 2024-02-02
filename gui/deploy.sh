#!/bin/bash

set -e

# See https://github.com/magland/fi-sci
cd ../../fi-sci && nx build neurosift
npx gh-pages -d dist/apps/neurosift --repo https://github.com/flatironinstitute/neurosift --branch gh-pages --no-history
