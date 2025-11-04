#!/bin/bash

set -ex

npm run build
wrangler pages deploy dist --project-name neurosift