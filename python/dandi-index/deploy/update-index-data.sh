#!/usr/bin/env bash
#
# Refresh the DANDI / OpenNeuro / EBRAINS index data consumed by the job runner.
# Intended to be run from cron. The job runner reads these JSON files fresh on
# every request, so the service does NOT need restarting after this runs.
#
# Usage:
#   update-index-data.sh                 # base refresh (dandi.json + per-dandiset)
#   update-index-data.sh --embeddings    # also refresh embeddings (needs OPENAI_API_KEY)
#   update-index-data.sh --assets        # also refresh per-asset NWB metadata (slow)
#
# Point DANDI_INDEX_PYTHON at a python that has: openai requests h5py lindi
# (add pynwb/remfile if you use --assets).
set -euo pipefail

# cd to <repo>/python/dandi-index (this script lives in deploy/ one level down)
cd "$(dirname "$(readlink -f "$0")")/.."

PYTHON="${DANDI_INDEX_PYTHON:-$HOME/neurosift-venv/bin/python}"

echo "[$(date -u +%FT%TZ)] update-index-data.sh $* (python=$PYTHON, cwd=$(pwd))"
"$PYTHON" scripts/update_data.py "$@"
echo "[$(date -u +%FT%TZ)] done"
