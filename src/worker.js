import { loadConfig } from "../lib/env.js";
import { runFeedbackCycle } from "../lib/run-feedback.js";

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const config = loadConfig(env);
    if (!isAuthorized(request, config.cronSecret)) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    try {
      const result = await runFeedbackCycle(config);
      return json(result, 200);
    } catch (error) {
      return json({ ok: false, error: toMessage(error) }, 500);
    }
  },

  async scheduled(_event, env, ctx) {
    const config = loadConfig(env);
    ctx.waitUntil(runScheduled(config));
  }
};

async function runScheduled(config) {
  try {
    const result = await runFeedbackCycle(config);
    console.log(JSON.stringify({ type: "scheduled_run", ...result }));
  } catch (error) {
    console.error(JSON.stringify({ type: "scheduled_error", error: toMessage(error) }));
    throw error;
  }
}

function isAuthorized(request, cronSecret) {
  if (!cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}

function json(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function toMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}
