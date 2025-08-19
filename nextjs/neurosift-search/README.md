# Neurosift Search API

A standalone Next.js API service for executing scripts via the Neurosift job runner system using PubNub.

## Overview

This service provides API endpoints for executing scripts and performing DANDI semantic searches through the existing Neurosift job runner infrastructure. The PubNub client persists in memory across serverless requests for optimal performance.

## API Endpoints

### POST `/api/execute-script`

Executes a script via the job runner system and returns the raw output.

**Request Body:**

```json
{
  "script": "your_javascript_script_here"
}
```

**Response (Success):**

```json
{
  "success": true,
  "output": "script_output_here"
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "error_message_here"
}
```

**Status Codes:**

- `200` - Success
- `400` - Bad request (missing/invalid script)
- `408` - Request timeout (job runner offline)
- `500` - Internal server error

### POST `/api/dandi-semantic-search`

Performs a DANDI semantic search and returns a list of relevant dandiset IDs.

**Request Body:**

```json
{
  "query": "your_search_query_here"
}
```

**Response (Success):**

```json
{
  "success": true,
  "dandisetIds": ["000001", "000002", "000003"]
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "error_message_here"
}
```

**Status Codes:**

- `200` - Success
- `400` - Bad request (missing/invalid query)
- `408` - Request timeout (job runner offline)
- `500` - Internal server error

## Environment Variables

Set these in your Vercel deployment configuration:

- `PUBNUB_SUBSCRIBE_KEY` - PubNub subscribe key
- `PUBNUB_PUBLISH_KEY` - PubNub publish key

## Usage Examples

### Execute Script

```bash
curl -X POST https://neurosift-search.vercel.app/api/execute-script \
  -H "Content-Type: application/json" \
  -d '{
    "script": "interface.print(\"Hello from job runner!\");"
  }'
```

### DANDI Semantic Search

```bash
curl -X POST https://neurosift-search.vercel.app/api/dandi-semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "olfactory bulb rat"
  }'
```

## Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set environment variables in Vercel configuration

3. Run development server:

   ```bash
   npm run dev
   ```

4. Test the API:
   ```bash
   curl -X POST http://localhost:3001/api/execute-script \
     -H "Content-Type: application/json" \
     -d '{"script": "interface.print(\"test\");"}'
   ```

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

## Architecture

- **Persistent PubNub Client**: A singleton client instance persists across serverless requests
- **Job Runner Integration**: Uses the same channels and protocols as the main Neurosift application
- **CORS Enabled**: Allows cross-origin requests for web integration
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes

## PubNub Configuration

- **User ID**: `neurosift-search`
- **Job Channel**: `dandi-index-query-job-requests`
- **Response Channel**: `dandi-index-query-job-responses`
- **Timeout**: 10 seconds for job acceptance
