import PubNub from 'pubnub';
import { createScriptInterface } from './scriptInterface';
import { readFileSync } from 'fs';
import { join } from 'path';

const systemMessageText = readFileSync(join(__dirname, 'systemMessage.txt'), 'utf8');


interface JobMessage {
  jobId: string;
  script: string;
}

type PubNubMessageObject = {
  jobId: string;
  status: 'accepted' | 'rejected' | 'completed' | 'error';
  error?: string;
  output?: string;
} | {
  type: 'probe-response';
  status: 'alive';
  systemMessage: string;
}

const MAX_CONCURRENT_JOBS = 3;
let currentJobs = 0;

export class JobRunner {
  private pubnub: PubNub;
  private jobChannel: string;
  private responseChannel: string;

  constructor(subscribeKey: string, publishKey: string, jobChannel: string, responseChannel: string) {
    this.pubnub = new PubNub({
      subscribeKey,
      publishKey,
      userId: `job-runner-${Math.random().toString(36).slice(2, 9)}`
    });
    this.jobChannel = jobChannel;
    this.responseChannel = responseChannel;
  }

  async start() {
    console.info('Initializing job runner...');
    // Create channel subscriptions
    const jobSubscription = this.pubnub.channel(this.jobChannel).subscription();

    // Add message handler
    jobSubscription.onMessage = (messageEvent) => {
      console.info(`Received message on channel ${this.jobChannel}`);
      const message = messageEvent.message;
      if (this.isValidJobMessage(message)) {
        this.handleJobMessage(message);
      }
      else if (this.isValidProbe(message)) {
        this.handleProbeMessage(message);
      }
    };

    // Subscribe to the job channel
    jobSubscription.subscribe();

    // Add status listener
    this.pubnub.addListener({
      status: (status) => {
        console.log('PubNub Status:', status.category);
      }
    });

    console.log(`Job runner started. Listening on channel: ${this.jobChannel}`);
  }

  private isValidProbe(message: unknown): message is { type: 'probe' } {
    if (typeof message !== 'object' || message === null) {
      console.info('Invalid probe message: not an object or null');
      return false;
    }
    const { type } = message as { type: string };
    const isValid = type === 'probe';
    return isValid;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleProbeMessage(_message: { type: 'probe' }) {
    console.info('Received probe message, responding with system message');
    const msg = {
      type: 'probe-response',
      status: 'alive',
      systemMessage: systemMessageText
    } as PubNubMessageObject;
    this.pubnub.publish({
      channel: this.responseChannel,
      message: msg
    }).then(() => {
      console.info('Probe response sent successfully');
    }).catch((error) => {
      console.error('Error sending probe response:', error);
    });
  }

  private isValidJobMessage(message: unknown): message is JobMessage {
    if (typeof message !== 'object' || message === null) {
      console.info('Invalid message: not an object or null');
      return false;
    }
    const { jobId, script } = message as JobMessage;
    const isValid = typeof jobId === 'string' && typeof script === 'string';
    return isValid;
  }

  private async handleJobMessage(jobMessage: JobMessage) {
    console.info(`Processing job ${jobMessage.jobId}`);
    console.info(`Current concurrent jobs: ${currentJobs}/${MAX_CONCURRENT_JOBS}`);
    if (currentJobs >= MAX_CONCURRENT_JOBS) {
      console.info('Maximum concurrent jobs reached, rejecting job');
      await this.sendResponse({
        jobId: jobMessage.jobId,
        status: 'rejected',
        error: 'Maximum number of concurrent jobs reached'
      });
      return;
    }

    currentJobs++;
    console.info(`Incremented concurrent jobs count to ${currentJobs}`);
    await this.sendResponse({
      jobId: jobMessage.jobId,
      status: 'accepted'
    });

    try {
      console.info(`Starting execution of job ${jobMessage.jobId}`);
      let result = await this.executeJob(jobMessage);
      console.info(`Job ${jobMessage.jobId} completed successfully`);
      if (result.length > 10000) {
        result = `${result.slice(0, 10000)}... [output truncated]`;
      }
      await this.sendResponse({
        jobId: jobMessage.jobId,
        status: 'completed',
        output: result
      });
    } catch (error) {
      console.info(`Job ${jobMessage.jobId} failed:`, error);
      await this.sendResponse({
        jobId: jobMessage.jobId,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      currentJobs--;
      console.info(`Decremented concurrent jobs count to ${currentJobs}`);
    }
  }

  private async executeJob(jobMessage: JobMessage): Promise<string> {
    console.info(`Setting up execution environment for job ${jobMessage.jobId}`);
    return new Promise((resolve, reject) => {
      const scriptInterface = createScriptInterface((status) => {
        console.info(`Job ${jobMessage.jobId} status update:`, status);
      });

      console.info('Creating async function from script');
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const scriptFn = new AsyncFunction('interface', jobMessage.script);

      console.info(`Beginning script execution for job ${jobMessage.jobId}`);
      scriptFn(scriptInterface)
        .then(() => resolve(scriptInterface._getOutput()))
        .catch(reject);
    });
  }

  private async sendResponse(message: PubNubMessageObject & { jobId: string }) {
    console.info(`Sending response for job ${message.jobId}:`, message.status);
    const publishPayload = {
      channel: this.responseChannel,
      message
    };
    const numRetries = 4;
    let tryNumber = 1;
    let retryDelay = 2000;
    while (tryNumber <= numRetries) {
      try {
        await this.pubnub.publish(publishPayload);
        break;
      }
      catch (err) {
        console.warn("Problem publishing payload", err);
        if (tryNumber < numRetries) {
          console.info(`Retrying to send response for job ${message.jobId} (attempt ${tryNumber})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
          tryNumber++;
        }
        else {
          throw new Error(`Failed to send response for job ${message.jobId} after ${numRetries} attempts`);
        }
      }
    }
  }

  async stop() {
    console.info('Stopping job runner...');
    const jobSubscription = this.pubnub.channel(this.jobChannel).subscription();
    jobSubscription.unsubscribe();
    this.pubnub.stop();
  }
}
