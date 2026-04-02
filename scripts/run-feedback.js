import { loadConfig } from "../lib/env.js";
import { runFeedbackCycle } from "../lib/run-feedback.js";

async function main() {
  const config = loadConfig();
  const result = await runFeedbackCycle(config);

  const counts = result.results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  process.stdout.write(`Board: ${result.boardId}\n`);
  process.stdout.write(`Checked posts: ${result.checked}\n`);
  process.stdout.write(`Status counts: ${JSON.stringify(counts)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
