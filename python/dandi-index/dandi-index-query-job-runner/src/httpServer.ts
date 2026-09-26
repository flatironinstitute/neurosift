// HTTP transport for the job runner. Exposes the same endpoints and response
// shapes as the neurosift-search Vercel service (nextjs/neurosift-search), so
// clients can switch by changing only the base URL:
//
//   GET  /api/probe                  -> { status: "alive", systemMessage }
//   POST /api/execute-script         { script } -> { success, output | error }
//   POST /api/dandi-semantic-search  { query }  -> { success, dandisetIds | error }
//
// It is meant to listen on localhost behind a reverse proxy (e.g. Caddy) that
// terminates TLS.
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { createScriptInterface } from './scriptInterface';
import { executeJob, releaseJobSlot, systemMessageText, tryAcquireJobSlot } from './jobExecution';

const MAX_BODY_BYTES = 1024 * 1024;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readJsonBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (typeof body !== 'object' || body === null) throw new Error();
        resolve(body);
      } catch {
        reject(new HttpError(400, 'Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });

// Runs fn in one of the shared job slots, or responds 429 if none is free.
const withJobSlot = async (res: ServerResponse, fn: () => Promise<void>) => {
  if (!tryAcquireJobSlot()) {
    sendJson(res, 429, { success: false, error: 'Maximum number of concurrent jobs reached' });
    return;
  }
  try {
    await fn();
  } finally {
    releaseJobSlot();
  }
};

const handleExecuteScript = async (req: IncomingMessage, res: ServerResponse) => {
  const { script } = await readJsonBody(req);
  if (!script || typeof script !== 'string') {
    throw new HttpError(400, 'Missing or invalid script parameter');
  }
  const jobId = randomUUID();
  console.info(`HTTP job ${jobId} received`);
  await withJobSlot(res, async () => {
    try {
      const output = await executeJob(jobId, script);
      console.info(`Job ${jobId} completed successfully`);
      sendJson(res, 200, { success: true, output });
    } catch (error) {
      // Script failures are reported with 200 and success: false, matching
      // the neurosift-search service.
      console.info(`Job ${jobId} failed:`, error);
      sendJson(res, 200, { success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
};

const handleDandiSemanticSearch = async (req: IncomingMessage, res: ServerResponse) => {
  const { query } = await readJsonBody(req);
  if (typeof query !== 'string') {
    throw new HttpError(400, 'Missing or invalid query parameter');
  }
  if (!query.trim()) {
    sendJson(res, 200, { success: true, dandisetIds: [] });
    return;
  }
  // This is fixed server-side code, so it calls the interface directly
  // rather than going through the script sandbox.
  await withJobSlot(res, async () => {
    const scriptInterface = createScriptInterface(() => {});
    const dandisets = await scriptInterface.getDandisets();
    const sorted = await scriptInterface.semanticSortDandisets(dandisets, query);
    const dandisetIds = sorted.map((d) => d.dandiset_id).slice(0, 20);
    sendJson(res, 200, { success: true, dandisetIds });
  });
};

const route = async (req: IncomingMessage, res: ServerResponse) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  if (req.method === 'GET' && path === '/api/probe') {
    sendJson(res, 200, { status: 'alive', systemMessage: systemMessageText });
    return;
  }
  if (req.method === 'POST' && path === '/api/execute-script') {
    await handleExecuteScript(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/dandi-semantic-search') {
    await handleDandiSemanticSearch(req, res);
    return;
  }
  throw new HttpError(404, 'Not found');
};

export const startHttpServer = (port: number, host: string): Promise<Server> => {
  const server = createServer((req, res) => {
    route(req, res).catch((error) => {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('Error handling HTTP request:', error);
      if (!res.headersSent) {
        sendJson(res, status, { success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      console.log(`HTTP server listening on http://${host}:${port}`);
      resolve(server);
    });
  });
};
