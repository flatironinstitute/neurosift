// Simple client-side rate limiting using localStorage
const RATE_LIMIT_KEY = "neurosift-log-last-sent";
const RATE_LIMIT_MS = 5 * 1000; // 5 seconds

const WORKER_URL = "https://neurosift-logs.figurl.workers.dev";

interface LogPayload {
  message: string;
  metadata?: Record<string, unknown>;
}

function canSendLog(): boolean {
  try {
    const lastSent = localStorage.getItem(RATE_LIMIT_KEY);
    if (!lastSent) return true;

    const timeSinceLastLog = Date.now() - parseInt(lastSent, 10);
    return timeSinceLastLog >= RATE_LIMIT_MS;
  } catch {
    // If localStorage is not available, allow logging
    return true;
  }
}

function updateLastSent(): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

export async function sendLog(payload: LogPayload): Promise<void> {
  // Check rate limit
  if (!canSendLog()) {
    return;
  }

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      updateLastSent();
    } else {
      console.warn("Failed to send log:", response.status);
    }
  } catch (error) {
    // Silently fail - don't break the app
    console.warn("Error sending log:", error);
  }
}

export function logPageLoad(url: string): void {
  sendLog({
    message: "Page loaded: " + url,
    metadata: {
      url,
    },
  });
}
