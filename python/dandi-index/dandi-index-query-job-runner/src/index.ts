// Load environment variables from .env file BEFORE importing ./jobRunner,
// which transitively constructs the OpenAI client at module-load time.
import 'dotenv/config';
import { Server } from 'http';
import { JobRunner } from './jobRunner';
import { startHttpServer } from './httpServer';

// Either transport can be enabled on its own:
//   PubNub: set PUBNUB_SUBSCRIBE_KEY and PUBNUB_PUBLISH_KEY
//   HTTP:   set HTTP_PORT (and optionally HTTP_HOST, default 127.0.0.1)
const {
  PUBNUB_SUBSCRIBE_KEY,
  PUBNUB_PUBLISH_KEY,
  JOB_CHANNEL = 'dandi-index-query-job-requests',
  RESPONSE_CHANNEL = 'dandi-index-query-job-responses',
  HTTP_PORT,
  HTTP_HOST = '127.0.0.1'
} = process.env;

const usePubNub = !!(PUBNUB_SUBSCRIBE_KEY && PUBNUB_PUBLISH_KEY);
const httpPort = HTTP_PORT ? Number(HTTP_PORT) : undefined;

if (!usePubNub && !httpPort) {
  console.error('Error: set PUBNUB_SUBSCRIBE_KEY and PUBNUB_PUBLISH_KEY, or HTTP_PORT, in environment variables');
  process.exit(1);
}

async function main() {
  const jobRunner = usePubNub
    ? new JobRunner(
      PUBNUB_SUBSCRIBE_KEY as string,
      PUBNUB_PUBLISH_KEY as string,
      JOB_CHANNEL,
      RESPONSE_CHANNEL
    )
    : undefined;
  let httpServer: Server | undefined;

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down...`);
    httpServer?.close();
    await jobRunner?.stop();
    process.exit(0);
  };

  // Handle graceful shutdown
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    if (jobRunner) await jobRunner.start();
    if (httpPort) httpServer = await startHttpServer(httpPort, HTTP_HOST);
  } catch (error) {
    console.error('Error starting job runner:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
