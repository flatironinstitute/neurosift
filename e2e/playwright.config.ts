import { defineConfig, devices } from "@playwright/test";

// The built app, served on its own port so it can run beside the docs suite (4322).
const PORT = Number(process.env.E2E_PORT ?? 4391);

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Live archives can be slow to answer when their caches are cold.
  timeout: 150_000,
  expect: { timeout: 90_000 },
  workers: 2,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    cwd: "..",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
