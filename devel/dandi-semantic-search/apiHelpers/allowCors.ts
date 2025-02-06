import { VercelRequest, VercelResponse } from "@vercel/node";

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://neurosift2.vercel.app",
  "https://v2.neurosift.app",
  "https://neurosift.app",
  "https://hub.dandiarchive.org",
  "https://dandiarchive.org",
  "https://gui-staging.dandiarchive.org"
];
const ALLOWED_ORIGINS = (
  process.env["ALLOWED_ORIGINS"] || defaultAllowedOrigins.join(",")
).split(",");

const allowCors =
  (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) =>
  async (req: VercelRequest, res: VercelResponse) => {
    const origin = req.headers.origin || "";
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, x-secret-key"
    );
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    return await fn(req, res);
  };

export default allowCors;
