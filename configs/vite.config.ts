import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { aliases, rootDir } from "./aliases";

// https://vite.dev/config/
// This file lives in configs/ rather than the repo root, so `root` has to be set
// explicitly — otherwise Vite would look for index.html next to this file.
export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: aliases,
  },
});
