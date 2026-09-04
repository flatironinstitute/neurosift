import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    env: {
      // lib/db.ts refuses to load without this; the tests mock the module
      // anyway, but the guard runs before the mock can take effect elsewhere.
      MONGODB_URI: "mongodb://localhost/test",
    },
  },
});
