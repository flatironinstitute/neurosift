# Deploying the DANDI-index job runner

The job runner is the backend for script execution on **chat.neurosift.app**. It
subscribes to the PubNub channel `dandi-index-query-job-requests`, runs each
submitted script, and publishes results to `dandi-index-query-job-responses`.
Because PubNub is a cloud pub/sub, the runner can live anywhere with outbound
internet — it does not need a public IP or inbound ports.

This directory holds the artifacts for running it as an always-on systemd
service on a fresh Ubuntu droplet, with cron-refreshed index data. It supersedes
the older `../instructions.txt` (which used tmux).

## 1. Droplet + user

Create an Ubuntu 24.04 droplet (the basic $6/mo tier is plenty). Then, as root:

```bash
adduser --disabled-password --gecos "" neurosift
usermod -aG sudo neurosift
```

Do the rest as `neurosift` (`su - neurosift`).

## 2. Install Node (system-wide, so systemd finds it at /usr/bin/node)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # expect v20.x -> /usr/bin/node
```

## 3. Install Python + data-build deps

```bash
sudo apt-get install -y python3-venv
python3 -m venv ~/neurosift-venv
~/neurosift-venv/bin/pip install --upgrade pip
~/neurosift-venv/bin/pip install openai requests h5py lindi   # add pynwb remfile for --assets
```

## 4. Clone and build the runner

```bash
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

## 5. Build the initial index data

```bash
cd ~/neurosift/python/dandi-index
~/neurosift-venv/bin/python scripts/update_data.py               # base (~2-3 min, 600+ dandisets)
~/neurosift-venv/bin/python scripts/update_data.py --embeddings  # optional: enables semanticSortDandisets
~/neurosift-venv/bin/python scripts/update_data.py --assets      # optional: slow, per-asset NWB metadata
```

## 6. Install the systemd service

```bash
# Edit User / WorkingDirectory / ExecStart in the unit if your username or paths differ:
sudo cp ~/neurosift/python/dandi-index/deploy/neurosift-job-runner.service \
        /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now neurosift-job-runner
systemctl status neurosift-job-runner
journalctl -u neurosift-job-runner -f    # expect "Job runner started ... PNConnectedCategory"
```

`Restart=always` + `enable` means it comes back after crashes and reboots — the
thing the old tmux setup lacked.

## 7. Cron the data refresh

The runner picks up refreshed data with no restart. Make the wrapper executable
and add crontab entries:

```bash
chmod +x ~/neurosift/python/dandi-index/deploy/update-index-data.sh
crontab -e
```

```cron
# Base refresh every 6 hours (update_data.py self-skips work that is still fresh)
0 */6 * * * /home/neurosift/neurosift/python/dandi-index/deploy/update-index-data.sh >> ~/update-index-data.log 2>&1
# Embeddings once a day
30 4 * * *  /home/neurosift/neurosift/python/dandi-index/deploy/update-index-data.sh --embeddings >> ~/update-index-data.log 2>&1
```

## Updating the runner code later

```bash
cd ~/neurosift && git pull
cd python/dandi-index/dandi-index-query-job-runner && npm install && npm run build
sudo systemctl restart neurosift-job-runner
```

## Sanity check

`journalctl -u neurosift-job-runner` should show `PNConnectedCategory`. Then open
chat.neurosift.app and run a query that executes a script — it should return
results instead of "the job runner is probably offline".
