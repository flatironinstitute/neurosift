import { VercelRequest, VercelResponse } from "@vercel/node";

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "https://neurosift.app",
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
      "Authorization, Content-Type",
    );
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    return await fn(req, res);
  };

export default allowCors;
