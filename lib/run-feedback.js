import {
  fetchBoardSnapshot,
  getCandidatePosts,
  hasExistingBotFeedback,
  createComment
} from "./padlet.js";
import { moderateText, generateFeedback } from "./openai.js";

export async function runFeedbackCycle(config) {
  const snapshot = await fetchBoardSnapshot(config);
  const candidates = getCandidatePosts(snapshot, config).slice(0, config.maxPostsPerRun);
  const results = [];

  for (const post of candidates) {
    if (hasExistingBotFeedback(snapshot, post.id, config.botDisplayName)) {
      results.push({
        postId: post.id,
        status: "skipped_existing_comment",
        inputPreview: preview(post.text)
      });
      continue;
    }

    const moderation = await moderateText(config, post.text);
    if (moderation.flagged) {
      results.push({
        postId: post.id,
        status: "flagged_for_teacher_review",
        inputPreview: preview(post.text),
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
    results.push({
      postId: post.id,
      status: "comment_created",
      inputPreview: preview(post.text),
      feedbackPreview: preview(feedback)
    });
  }

  return {
    ok: true,
    boardId: config.boardId,
    checked: candidates.length,
    results,
    diagnostics: snapshot.diagnostics
  };
}

function preview(value, maxLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}¡¦`;
}
