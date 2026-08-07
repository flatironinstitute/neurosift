import { defineConfig } from "@playwright/test";
import { sharedConfig } from "./playwright.shared";

// Functional integration tests: `npm run test:integration`.
export default defineConfig({
  ...sharedConfig,
  testDir: "./tests/integration",
});
