export function loadConfig() {
  const config = {
    padletApiKey: process.env.PADLET_API_KEY,
    boardId: process.env.PADLET_BOARD_ID,
    botDisplayName: process.env.PADLET_BOT_DISPLAY_NAME || "AI Feedback Bot",
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    cronSecret: process.env.CRON_SECRET || "",
    pollLookbackMinutes: toInt(process.env.POLL_LOOKBACK_MINUTES, 60),
    maxPostsPerRun: toInt(process.env.MAX_POSTS_PER_RUN, 5)
  };

  const missing = [
    ["PADLET_API_KEY", config.padletApiKey],
    ["PADLET_BOARD_ID", config.boardId],
    ["OPENAI_API_KEY", config.openAiApiKey]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.map(([name]) => name).join(", ")}`);
  }

  return config;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

