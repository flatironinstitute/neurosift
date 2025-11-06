# Neurosift Logs - Cloudflare Worker

A simple Cloudflare Worker that receives log messages from Neurosift via HTTP requests and outputs them to console.log where they can be captured by Cloudflare Worker logs.

## Setup

1. Install dependencies:
   ```bash
   cd cf-workers/neurosift-logs
   npm install
   ```

2. Test locally:
   ```bash
   npm run dev
   ```

3. Deploy to Cloudflare:
   ```bash
   npm run deploy
   ```

4. View logs in real-time:
   ```bash
   npm run tail
   ```

## API

### POST /

Send a log message to the worker.

**Request:**
```bash
curl -X POST https://neurosift-logs.your-subdomain.workers.dev/ \
  -H "Content-Type: application/json" \
  -H "Origin: https://neurosift.app" \
  -d '{
    "message": "User viewed dataset",
    "level": "info",
    "metadata": {
      "datasetId": "abc123",
      "userId": "user456"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "logged": true
}
```

### Fields

- `message` (required): The log message
- `level` (optional): Log level (e.g., "info", "warn", "error"). Defaults to "info"
- `timestamp` (optional): ISO 8601 timestamp. Defaults to current time
- `metadata` (optional): Additional data to include with the log

## Viewing Logs

Logs can be viewed in:
1. Real-time via `npm run tail`
2. Cloudflare Dashboard > Workers & Pages > neurosift-logs > Logs
3. Using the Cloudflare API

## CORS

The worker accepts requests from:
- `https://localhost:5173` (local development)
- `https://neurosift.app` (production)

To add more origins, edit the `ALLOWED_ORIGINS` array in `src/index.ts`.

## Local Development

The worker runs on `http://localhost:8787` by default when using `npm run dev`.

Example test request:
```bash
curl -X POST http://localhost:8787/ \
  -H "Content-Type: application/json" \
  -H "Origin: https://localhost:5173" \
  -d '{"message": "Test log", "level": "debug"}'
