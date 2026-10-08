// Checks how much JavaScript each page downloads before it can render: the
// entry chunk, the page's own chunk, and everything those import statically.
// Chunks behind a dynamic import (Plotly, the NIfTI viewer, individual NWB
// views) are not counted, since they are fetched only when used. A page going
// over the budget usually means one of those was imported statically again.
//
// Run after `npm run build`, which writes dist/.vite/manifest.json. A different
// build directory can be given as the first argument.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_KB = 1200;

const dist =
  process.argv[2] ??
  join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const manifest = JSON.parse(
  readFileSync(join(dist, ".vite", "manifest.json"), "utf-8"),
);

const staticClosure = (keys) => {
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    (manifest[key].imports ?? []).forEach(visit);
  };
  keys.forEach(visit);
  return seen;
};

const sizeKb = (keys) => {
  let bytes = 0;
  for (const key of keys) {
    bytes += readFileSync(join(dist, manifest[key].file)).length;
  }
  return bytes / 1000;
};

const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entry) throw new Error("No entry chunk in the build manifest");

// The entry chunk holds the router, so its dynamic imports are the pages.
const pages = manifest[entry].dynamicImports ?? [];
if (pages.length === 0) {
  throw new Error("The entry chunk has no lazily loaded pages");
}

let failed = false;
for (const page of pages) {
  const kb = sizeKb(staticClosure([entry, page]));
  const over = kb > BUDGET_KB;
  failed ||= over;
  console.log(
    `${over ? "FAIL" : "ok  "} ${kb.toFixed(0).padStart(6)} kB  ${manifest[page].name ?? page}`,
  );
}

if (failed) {
  console.error(
    `\nA page loads more than ${BUDGET_KB} kB of JavaScript up front. Load the heavy dependency with a dynamic import (see src/components/LazyPlot.tsx).`,
  );
  process.exit(1);
}
