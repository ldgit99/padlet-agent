import { loadConfig } from "../lib/env.js";
import { runFeedbackCycle } from "../lib/run-feedback.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const config = loadConfig();

  if (!isAuthorized(req, config.cronSecret)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const result = await runFeedbackCycle(config);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function isAuthorized(req, cronSecret) {
  if (!cronSecret) {
    return true;
  }

  const authHeader = req.headers.authorization || "";
  const expected = `Bearer ${cronSecret}`;
  return authHeader === expected;
}
