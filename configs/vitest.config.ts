import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Inherits `root` and the path aliases (@components, @shared, ...) from
// vite.config.ts so unit tests import modules exactly the way the app does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Both the standalone suite under tests/unit and tests colocated next to
      // the source they cover. Listed explicitly rather than left to Vitest's
      // default glob because that default would also sweep up tests/integration
      // and tests/chromatic, which are Playwright suites.
      include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
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
