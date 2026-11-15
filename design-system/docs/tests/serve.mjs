// Serves the built docs (dist/) for the accessibility suite, under DOCS_BASE as neurosift.app does.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../dist/", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const BASE = process.env.DOCS_BASE ?? "/";

createServer((request, response) => {
  const url = new URL(request.url, "http://x").pathname;
  if (!url.startsWith(BASE)) return response.writeHead(404).end();
  const path = normalize(decodeURIComponent(url.slice(BASE.length - 1)));
  let file = join(ROOT, path);
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory())
    file = join(file, "index.html");
  if (!existsSync(file)) return response.writeHead(404).end();
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(Number(process.argv[2] ?? 4322));
