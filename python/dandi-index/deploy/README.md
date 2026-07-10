# Deploying the DANDI-index job runner

The job runner is the backend for script execution on **chat.neurosift.app**. It
subscribes to the PubNub channel `dandi-index-query-job-requests`, runs each
submitted script, and publishes results to `dandi-index-query-job-responses`.
Because PubNub is a cloud pub/sub, the runner can live anywhere with outbound
internet — it does not need a public IP or inbound ports.

This directory holds the artifacts for running it as an always-on systemd
service on a fresh Ubuntu droplet, with cron-refreshed index data. It supersedes
the older `../instructions.txt` (which used tmux).

**Privilege model:** system packages and the systemd service are installed as
**root**; the app files, index data, and the running service belong to an
unprivileged **`neurosift`** user, which never needs sudo. Verified on Ubuntu
24.04 (x86_64).

## 1. Droplet

Create an Ubuntu 24.04 (LTS) x86_64 droplet. The basic tier works; more RAM
gives headroom for the optional `--assets` data build. SSH-key auth is
preferred, but password + the DigitalOcean web console is fine. Log in as root.

```bash
apt-get update && apt-get -y upgrade
```

## 2. (root) System packages: Node, Python, git

Node system-wide via NodeSource, so systemd finds it at `/usr/bin/node`:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git python3-venv
node -v && which node   # expect v20.x at /usr/bin/node
```

## 3. (root) Create the unprivileged service user

```bash
adduser --disabled-password --gecos "" neurosift
```

No sudo group needed — root handles everything privileged below.

## 4. (as neurosift) Clone, build, configure

```bash
su - neurosift
git clone https://github.com/flatironinstitute/neurosift ~/neurosift
cd ~/neurosift/python/dandi-index/dandi-index-query-job-runner
npm install
npm run build          # tsc + copies systemMessage.txt into dist/
```

Create the `.env` in this directory (it is gitignored):

```
PUBNUB_PUBLISH_KEY="pub-c-..."
PUBNUB_SUBSCRIBE_KEY="sub-c-..."
OPENAI_API_KEY="sk-..."
```

## 5. (as neurosift) Python env + initial index data

```bash
python3 -m venv ~/neurosift-venv
~/neurosift-venv/bin/pip install --upgrade pip
~/neurosift-venv/bin/pip install openai requests h5py lindi   # add pynwb remfile for --assets

cd ~/neurosift/python/dandi-index
~/neurosift-venv/bin/python scripts/update_data.py               # base (~2-3 min, 600+ dandisets)
~/neurosift-venv/bin/python scripts/update_data.py --embeddings  # optional: enables semanticSortDandisets
~/neurosift-venv/bin/python scripts/update_data.py --assets      # optional: slow, per-asset NWB metadata
```

Then return to root: `exit`.

## 6. (root) Install the systemd service

```bash
# Edit User / WorkingDirectory / ExecStart in the unit only if your username or
# paths differ from the defaults (neurosift, /usr/bin/node):
cp /home/neurosift/neurosift/python/dandi-index/deploy/neurosift-job-runner.service \
   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now neurosift-job-runner
systemctl status neurosift-job-runner --no-pager
journalctl -u neurosift-job-runner -f    # expect "Job runner started ... PNConnectedCategory"
```

`Restart=always` + `enable` means it comes back after crashes and reboots — the
thing the old tmux setup lacked.

## 7. (as neurosift) Cron the data refresh

The runner picks up refreshed data with no restart. As the `neurosift` user
(`su - neurosift`), install the entries non-interactively (a single line, which
pastes reliably into the DigitalOcean web console — unlike `crontab -e` or
backslash-continued blocks):

```bash
printf '%s\n%s\n' '0 */6 * * * /home/neurosift/neurosift/python/dandi-index/deploy/update-index-data.sh >> ~/update-index-data.log 2>&1' '30 4 * * * /home/neurosift/neurosift/python/dandi-index/deploy/update-index-data.sh --embeddings >> ~/update-index-data.log 2>&1' | crontab -
crontab -l
```

That refreshes the base index every 6 hours (`update_data.py` self-skips work
that is still fresh) and embeddings daily at 04:30 UTC. The wrapper uses
`~/neurosift-venv/bin/python` by default; override with `DANDI_INDEX_PYTHON`.

## Updating the runner code later

```bash
sudo -u neurosift bash -c 'cd ~/neurosift && git pull && cd python/dandi-index/dandi-index-query-job-runner && npm install && npm run build'
systemctl restart neurosift-job-runner
```

## Sanity check

`journalctl -u neurosift-job-runner` should show `PNConnectedCategory`. Then open
chat.neurosift.app and run a query that executes a script — it should return
results instead of "the job runner is probably offline".
