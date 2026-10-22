#!/usr/bin/env bash
#
# Refresh the DANDI / OpenNeuro index data consumed by the job runner.
# Intended to be run from cron. The job runner reads these JSON files fresh on
# every request, so the service does NOT need restarting after this runs.
#
# Usage:
#   update-index-data.sh                 # base refresh (dandi + openneuro)
#   update-index-data.sh --embeddings    # also refresh embeddings (needs OPENAI_API_KEY)
#   update-index-data.sh --assets        # also refresh per-asset NWB metadata (DANDI only, slow)
#                                        # and rebuild data/neurodata_types_index.json.gz
#
# Both the DANDI and OpenNeuro indexes are refreshed. --embeddings applies to
# both; --assets applies to DANDI only (the OpenNeuro build has no asset pass).
# EBRAINS is intentionally NOT refreshed here: its build needs an EBRAINS auth
# TOKEN and the kg_core package, so it is a separate manual step.
#
# Point DANDI_INDEX_PYTHON at a python that has: openai requests h5py lindi
# (add pynwb/remfile if you use --assets).
set -euo pipefail

# Resolve the directory layout. This script lives in
# <repo>/python/dandi-index/deploy/, so:
DEPLOY_DIR="$(dirname "$(readlink -f "$0")")"   # python/dandi-index/deploy
DANDI_DIR="$DEPLOY_DIR/.."                       # python/dandi-index
PY_ROOT="$DANDI_DIR/.."                          # python

# The embeddings build reads OPENAI_API_KEY from the environment. Load it (and
# the PubNub keys) from the runner's .env so this works under cron, which does
# NOT source ~/.bashrc. Harmless for the base/--assets refreshes.
ENV_FILE="$DANDI_DIR/dandi-index-query-job-runner/.env"
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi

PYTHON="${DANDI_INDEX_PYTHON:-$HOME/neurosift-venv/bin/python}"

# Detect --embeddings so we can forward it to the OpenNeuro build (which does
# NOT understand --assets, so we never forward "$@" verbatim there).
EMB=""
ASSETS=""
for a in "$@"; do
  if [ "$a" = "--embeddings" ]; then EMB="--embeddings"; fi
  if [ "$a" = "--assets" ]; then ASSETS=1; fi
done

echo "[$(date -u +%FT%TZ)] update-index-data.sh $* (python=$PYTHON)"

echo "[$(date -u +%FT%TZ)] -- DANDI index ($DANDI_DIR)"
cd "$DANDI_DIR"
"$PYTHON" scripts/update_data.py "$@"
if [ -n "$ASSETS" ]; then
  # Rebuild the index behind Neurosift's neurodata-types search from the
  # per-asset info just refreshed (served at /api/neurodata-types-index).
  "$PYTHON" scripts/create_neurodata_types_index.py
fi

echo "[$(date -u +%FT%TZ)] -- OpenNeuro index ($PY_ROOT/openneuro-index)"
cd "$PY_ROOT/openneuro-index"
# shellcheck disable=SC2086  # $EMB is intentionally word-split (empty -> no arg)
"$PYTHON" scripts/update_data.py $EMB

echo "[$(date -u +%FT%TZ)] done"
