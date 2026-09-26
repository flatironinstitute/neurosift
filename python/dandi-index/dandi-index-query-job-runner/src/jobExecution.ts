// Transport-independent job execution, shared by the PubNub runner
// (jobRunner.ts) and the HTTP server (httpServer.ts). The concurrency limit
// applies across both transports.
import { computeOpenAIEmbedding, createScriptInterface, sandboxedInterfaceReadPaths } from './scriptInterface';
import { runScriptInSandbox } from './sandbox/runInSandbox';
import { readFileSync } from 'fs';
import { join } from 'path';

export const systemMessageText = readFileSync(join(__dirname, 'systemMessage.txt'), 'utf8');

export const MAX_CONCURRENT_JOBS = 3;
export const MAX_OUTPUT_LENGTH = 1000_000;
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS) || 5 * 60 * 1000;
let currentJobs = 0;

export const tryAcquireJobSlot = (): boolean => {
  console.info(`Current concurrent jobs: ${currentJobs}/${MAX_CONCURRENT_JOBS}`);
  if (currentJobs >= MAX_CONCURRENT_JOBS) return false;
  currentJobs++;
  console.info(`Incremented concurrent jobs count to ${currentJobs}`);
  return true;
};

export const releaseJobSlot = () => {
  currentJobs--;
  console.info(`Decremented concurrent jobs count to ${currentJobs}`);
};

export const executeJob = async (jobId: string, script: string): Promise<string> => {
  console.info(`Setting up execution environment for job ${jobId}`);
  const scriptInterface = createScriptInterface((status) => {
    console.info(`Job ${jobId} status update:`, status);
  });

  // The script runs in a separate process with no environment, no process
  // access, and read access only to the index data. The interface is built
  // inside that process; only printing and embedding computation (which
  // needs the API key) are forwarded back here.
  const host = {
    print: (text: string) => scriptInterface.print(text),
    computeSemanticEmbedding: computeOpenAIEmbedding,
  };
  console.info(`Beginning sandboxed execution of job ${jobId}`);
  await runScriptInSandbox(script, host, {
    timeoutMs: JOB_TIMEOUT_MS,
    interfaceModule: join(__dirname, 'scriptInterface.js'),
    readPaths: sandboxedInterfaceReadPaths(),
  });
  const output = scriptInterface._getOutput();
  if (output.length > MAX_OUTPUT_LENGTH) {
    throw new Error(`Job ${jobId} output is too large (${output.length} characters)`);
  }
  return output;
};
