import type { Page } from "@playwright/test";

const LOG_WORKER_URL = "https://neurosift-logs.figurl.workers.dev";

/**
 * Stubs out the fire-and-forget page-load telemetry that App.tsx sends on
 * mount, so tests neither depend on that worker being reachable nor pollute it
 * with CI traffic.
 */
export async function stubTelemetry(page: Page): Promise<void> {
  await page.route(`${LOG_WORKER_URL}/**`, (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
  await page.route(LOG_WORKER_URL, (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
}
