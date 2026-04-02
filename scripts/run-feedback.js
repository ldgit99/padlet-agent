import { loadConfig } from "../lib/env.js";
import { runFeedbackCycle } from "../lib/run-feedback.js";

async function main() {
  const config = loadConfig();
  const result = await runFeedbackCycle(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
