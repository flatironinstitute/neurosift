import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@css": path.resolve(__dirname, "./src/css"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@remote-h5-file": path.resolve(__dirname, "./src/remote-h5-file"),
      "@hdf5Interface": path.resolve(
        __dirname,
        "./src/pages/NwbPage/hdf5Interface",
      ),
      "@jobManager": path.resolve(__dirname, "./src/jobManager"),
    },
  },
  test: {
    environment: "node",
  },
});
