import { devices, type PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

const PORT = 4173;

/**
 * Settings shared by the integration run (playwright.config.ts) and the
 * Chromatic run (playwright.chromatic.config.ts) — everything but the testDir.
 *
 * Both runs go through `vite preview` on a production build rather than the dev
 * server, so what gets exercised (and archived for Chromatic) matches what is
 * deployed.
 */
export const sharedConfig: PlaywrightTestConfig = {
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    cwd: rootDir,
    reuseExistingServer: !process.env.CI,
    // The full Vite build is part of this command, so allow generously for it.
    timeout: 300_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Set PLAYWRIGHT_CHROMIUM_PATH to reuse a pre-installed browser binary
        // (e.g. in sandboxes that pin a browser outside of `playwright install`).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
};
