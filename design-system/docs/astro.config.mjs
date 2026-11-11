import react from "@astrojs/react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// DOCS_BASE sets the path prefix when the site is published under a subpath, such as /design-system/ on neurosift.app.
export default defineConfig({
  base: process.env.DOCS_BASE ?? "/",
  server: { port: 4321 },
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: {
    // The docs render the app's own components and fonts; one copy of React and Plex serves both.
    resolve: {
      alias: {
        "@ui": fileURLToPath(new URL("../../src/ui", import.meta.url)),
        "@fontsource": fileURLToPath(
          new URL("./node_modules/@fontsource", import.meta.url),
        ),
      },
      dedupe: ["react", "react-dom"],
    },
  },
});
