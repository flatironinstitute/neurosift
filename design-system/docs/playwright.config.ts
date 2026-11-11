import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;
const SITE = `http://localhost:${PORT}${process.env.DOCS_BASE ?? "/"}`;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: SITE },
  // Firefox has no customizable select, so it checks the fallback every component must keep.
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
  webServer: {
    command: `npm run build && node tests/serve.mjs ${PORT}`,
    url: SITE,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
