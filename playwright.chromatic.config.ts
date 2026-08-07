import { defineConfig } from "@playwright/test";
import { sharedConfig } from "./playwright.shared";

// Visual-snapshot tests: `npm run test:chromatic`. These archive each page for
// Chromatic instead of asserting on pixels locally, so they are kept in a
// separate directory from the functional integration tests.
export default defineConfig({
  ...sharedConfig,
  testDir: "./tests/chromatic",
});
