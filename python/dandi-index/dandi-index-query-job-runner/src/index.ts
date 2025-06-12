import { config } from 'dotenv';
import { JobRunner } from './jobRunner';

// Load environment variables from .env file
config();

const {
  PUBNUB_SUBSCRIBE_KEY,
  PUBNUB_PUBLISH_KEY,
  JOB_CHANNEL = 'dandi-index-query-job-requests',
  RESPONSE_CHANNEL = 'dandi-index-query-job-responses'
} = process.env;

if (!PUBNUB_SUBSCRIBE_KEY || !PUBNUB_PUBLISH_KEY) {
  console.error('Error: PUBNUB_SUBSCRIBE_KEY and PUBNUB_PUBLISH_KEY must be set in environment variables');
  process.exit(1);
}

async function main() {
  // Cast to string since we've verified they exist above
  const jobRunner = new JobRunner(
    PUBNUB_SUBSCRIBE_KEY as string,
    PUBNUB_PUBLISH_KEY as string,
    JOB_CHANNEL,
    RESPONSE_CHANNEL
  );

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down...');
    await jobRunner.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Shutting down...');
    await jobRunner.stop();
    process.exit(0);
  });

  try {
    await jobRunner.start();
  } catch (error) {
    console.error('Error starting job runner:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
