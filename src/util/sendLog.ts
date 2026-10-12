// Simple client-side rate limiting using localStorage
const RATE_LIMIT_KEY = "neurosift-log-last-sent";
const RATE_LIMIT_MS = 5 * 1000; // 5 seconds

const WORKER_URL = "https://neurosift-logs.figurl.workers.dev";

interface LogPayload {
  message: string;
  metadata?: Record<string, unknown>;
}

function canSendLog(rateLimitKey: string): boolean {
  try {
    const lastSent = localStorage.getItem(rateLimitKey);
    if (!lastSent) return true;

    const timeSinceLastLog = Date.now() - parseInt(lastSent, 10);
    return timeSinceLastLog >= RATE_LIMIT_MS;
  } catch {
    // If localStorage is not available, allow logging
    return true;
  }
}

function updateLastSent(rateLimitKey: string): void {
  try {
    localStorage.setItem(rateLimitKey, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

// Logs that share a rateLimitKey are limited together. Give a kind of log its
// own key when it must not be dropped because another kind was just sent.
export async function sendLog(
  payload: LogPayload,
  rateLimitKey: string = RATE_LIMIT_KEY,
): Promise<void> {
  // Check rate limit
  if (!canSendLog(rateLimitKey)) {
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
      updateLastSent(rateLimitKey);
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
