export function loadConfig(source = process.env) {
  const config = {
    padletApiKey: source.PADLET_API_KEY,
    boardId: source.PADLET_BOARD_ID,
    botDisplayName: source.PADLET_BOT_DISPLAY_NAME || "AI Feedback Bot",
    openAiApiKey: source.OPENAI_API_KEY,
    openAiModel: source.OPENAI_MODEL || "gpt-5-mini",
    cronSecret: source.CRON_SECRET || "",
    pollLookbackMinutes: toInt(source.POLL_LOOKBACK_MINUTES, 10),
    maxPostsPerRun: toInt(source.MAX_POSTS_PER_RUN, 5)
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
