import { VercelRequest, VercelResponse } from "@vercel/node";
import allowCors from "./allowCors"; // remove .js for local dev

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("Missing SECRET_KEY");
}

const OPEN_ROUTER_KEY = process.env.OPEN_ROUTER_KEY;
if (!OPEN_ROUTER_KEY) {
  throw new Error("Missing OPEN_ROUTER_KEY");
}

export const completionHandler = allowCors(
  async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      // get the authorization header
      const auth = req.headers.authorization;
      if (!auth) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (auth !== `Bearer ${SECRET_KEY}`) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPEN_ROUTER_KEY}`,
        },
        body: JSON.stringify(req.body),
      };

      const url = "https://openrouter.ai/api/v1/chat/completions";
      const resp = await fetch(url, options);
      if (!resp.ok) {
        throw new Error(`Failed to fetch from ${url}`);
      }
      const rr: {
        choices?: { message: { content: string; tool_calls?: any[] } }[];
      } = await resp.json();
      res.status(200).json(rr);
    } catch (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);