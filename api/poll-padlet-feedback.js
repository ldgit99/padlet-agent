import { loadConfig } from "../lib/env.js";
import {
  fetchBoardSnapshot,
  getCandidatePosts,
  hasExistingBotFeedback,
  createComment
} from "../lib/padlet.js";
import { moderateText, generateFeedback } from "../lib/openai.js";

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
    const snapshot = await fetchBoardSnapshot(config);
    const candidates = getCandidatePosts(snapshot, config).slice(0, config.maxPostsPerRun);

    const results = [];

    for (const post of candidates) {
      if (hasExistingBotFeedback(snapshot, post.id, config.botDisplayName)) {
        results.push({ postId: post.id, status: "skipped_existing_comment" });
        continue;
      }

      const moderation = await moderateText(config, post.text);
      if (moderation.flagged) {
        results.push({
          postId: post.id,
          status: "flagged_for_teacher_review",
          categories: moderation.categories
        });
        continue;
      }

      const feedback = await generateFeedback(config, {
        boardTitle: snapshot.boardTitle,
        postText: post.text,
        authorName: post.authorName
      });

      await createComment(config, post.id, feedback);
      results.push({ postId: post.id, status: "comment_created" });
    }

    res.status(200).json({
      ok: true,
      boardId: config.boardId,
      checked: candidates.length,
      results
    });
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

