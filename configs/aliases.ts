import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = fileURLToPath(new URL("..", import.meta.url));

/**
 * Path aliases shared by Vite, Vitest, and Storybook.
 *
 * Keep in sync with the `paths` entries in configs/tsconfig.app.json and
 * configs/tsconfig.test.json — TypeScript resolves those independently of the
 * bundler, so the two have to agree.
 */
export const aliases: Record<string, string> = {
  "@css": path.resolve(rootDir, "src/css"),
  "@components": path.resolve(rootDir, "src/components"),
  "@shared": path.resolve(rootDir, "src/shared"),
  "@remote-h5-file": path.resolve(rootDir, "src/remote-h5-file"),
  "@hdf5Interface": path.resolve(rootDir, "src/pages/NwbPage/hdf5Interface"),
  "@jobManager": path.resolve(rootDir, "src/jobManager"),
};
