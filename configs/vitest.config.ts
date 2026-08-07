import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Inherits `root` and the path aliases (@components, @shared, ...) from
// vite.config.ts so unit tests import modules exactly the way the app does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Only tests/unit — tests/integration and tests/chromatic are Playwright
      // suites and must not be picked up by Vitest.
      include: ["tests/unit/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: "v8",
        reportsDirectory: "coverage",
        include: ["src/**/*.{ts,tsx}"],
      },
    },
  }),
);
