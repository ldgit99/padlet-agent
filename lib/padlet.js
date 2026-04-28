const PADLET_BASE_URL = "https://api.padlet.dev/v1";
const BOT_COMMENT_MARKER = "\u2063\u2060\u2063\u2060\u2063";

export async function fetchBoardSnapshot(config) {
  const boardUrl = `${PADLET_BASE_URL}/boards/${config.boardId}?include=posts,comments`;
  console.log(`Padlet fetch board: ${boardUrl}`);

  const response = await fetch(boardUrl, {
    headers: {
      "X-API-KEY": config.padletApiKey,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Padlet board fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const posts = extractPosts(payload);
  const comments = extractComments(payload);

  return {
    raw: payload,
    boardTitle: extractTextValue(payload?.data?.attributes?.title) || "Untitled board",
    posts,
    comments,
    diagnostics: {
      dataType: payload?.data?.type || null,
      includedCount: Array.isArray(payload?.included) ? payload.included.length : 0,
      postCount: posts.length,
      commentCount: comments.length,
      samplePosts: posts.slice(0, 3).map((post) => ({
        id: post.id,
        title: post.title,
        body: preview(post.bodyText, 160),
        text: preview(post.text, 160),
        confidentBody: post.hasConfidentBody,
        candidates: post.candidates.slice(0, 8)
      }))
    }
  };
}

export function getCandidatePosts(snapshot, config) {
  const cutoff = Date.now() - config.pollLookbackMinutes * 60 * 1000;

  return snapshot.posts.filter((post) => {
    if (!post.hasConfidentBody) {
      return false;
    }

    if (!post.text.trim()) {
      return false;
    }

    if (!post.createdAt) {
      return true;
    }

    return new Date(post.createdAt).getTime() >= cutoff;
  });
}

export function hasExistingBotFeedback(snapshot, postId, botDisplayName) {
  const isBotComment = (comment) =>
    comment.rawBody.includes(BOT_COMMENT_MARKER) ||
    comment.body.includes(BOT_COMMENT_MARKER) ||
    normalize(comment.authorName) === normalize(botDisplayName);

  // postId 가 정상 추출된 댓글로 1차 검사
  const byPostId = snapshot.comments.filter((c) => c.postId === postId);
  if (byPostId.length > 0) {
    return byPostId.some(isBotComment);
  }

  // postId 추출 실패 시 중복 아닌 것으로 간주 — 댓글 누락이 중복보다 낫다
  return false;
}

export async function createComment(config, postId, text) {
  console.log(`Padlet create comment: ${PADLET_BASE_URL}/posts/${postId}/comments`);

  const response = await fetch(`${PADLET_BASE_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "X-API-KEY": config.padletApiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: {
        type: "comment",
        attributes: {
          htmlContent: toHtmlParagraphs(text) + BOT_COMMENT_MARKER
        }
      }
    })
  });

  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(`Padlet comment create failed: ${response.status} ${body}`);
  }

  return response.json();
}

function extractPosts(payload) {
  return collectNodes(payload, "post").map((node) => {
    const title = extractTextValue(node.attributes?.title || node.attributes?.subject || "");
    const bodyInfo = extractPostBodyInfo(node.attributes || {});

    return {
      id: node.id,
      title,
      bodyText: bodyInfo.text,
      text: bodyInfo.text,
      hasConfidentBody: bodyInfo.confident,
      candidates: bodyInfo.candidates,
      createdAt: node.attributes?.createdAt || node.attributes?.created_at || null,
      authorName: extractTextValue(
        node.attributes?.authorName ||
        node.relationships?.author?.data?.id ||
        "unknown"
      )
    };
  });
}

function extractComments(payload) {
  return collectNodes(payload, "comment").map((node) => {
    const rawBody = String(
      node.attributes?.htmlContent ||
      node.attributes?.body ||
      node.attributes?.content ||
      ""
    );

    return {
      id: node.id,
      postId: extractCommentPostId(node),
      rawBody,
      body: extractTextValue(rawBody),
      authorName: extractTextValue(
        node.attributes?.authorName ||
        node.relationships?.author?.data?.id ||
        "unknown"
      )
    };
  });
}

function extractCommentPostId(node) {
  // 직접 속성에서 먼저 탐색
  const fromAttr =
    node.attributes?.post_id ||
    node.attributes?.postId ||
    node.attributes?.wall_post_id;
  if (fromAttr) return String(fromAttr);

  // 알려진 relationship 키 순서대로 탐색
  const relKeys = ["post", "wall_post", "padlet_post", "parent_post"];
  for (const key of relKeys) {
    const id = node.relationships?.[key]?.data?.id;
    if (id) return String(id);
  }

  // 마지막 수단: relationships 전체를 순회해 type=post 인 id 탐색
  for (const rel of Object.values(node.relationships || {})) {
    if (rel?.data?.type === "post" && rel?.data?.id) {
      return String(rel.data.id);
    }
  }

  return "";
}

function collectNodes(payload, type) {
  const nodes = [];
  if (payload?.data) {
    if (Array.isArray(payload.data)) {
      nodes.push(...payload.data);
    } else {
      nodes.push(payload.data);
    }
  }
  if (Array.isArray(payload?.included)) {
    nodes.push(...payload.included);
  }
  return nodes.filter((node) => node?.type === type);
}

function extractPostBodyInfo(attributes) {
  const candidates = [];
  collectBodyCandidates(attributes, candidates, []);

  const normalized = candidates
    .map((candidate) => ({
      path: candidate.path,
      text: extractTextValue(candidate.value)
    }))
    .map((candidate) => ({
      ...candidate,
      text: candidate.text.trim()
    }))
    .filter((candidate) => candidate.text)
    .map((candidate) => ({
      ...candidate,
      score: scoreBodyCandidate(candidate.text, candidate.path)
    }))
    .sort((a, b) => b.score - a.score);

  const best = normalized[0];

  return {
    text: best && best.score >= 80 ? best.text : "",
    confident: Boolean(best && best.score >= 80),
    candidates: normalized.slice(0, 8).map((candidate) => ({
      path: candidate.path,
      score: candidate.score,
      preview: preview(candidate.text, 120)
    }))
  };
}

function collectBodyCandidates(value, results, path) {
  if (typeof value === "string") {
    const keyPath = path.join(".").toLowerCase();
    if (shouldIncludePath(keyPath)) {
      results.push({ path: keyPath, value });
    }
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBodyCandidates(item, results, [...path, String(index)]));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      collectBodyCandidates(child, results, [...path, key]);
    }
  }
}

function shouldIncludePath(keyPath) {
  if (!keyPath) {
    return true;
  }

  const rejectTerms = [
    "title",
    "subject",
    "author",
    "created",
    "updated",
    "thumbnail",
    "color",
    "icon",
    "attachment.id",
    "attachment.url",
    "attachment.file",
    "reactions",
    "comments",
    "href",
    "link",
    "url"
  ];

  return !rejectTerms.some((term) => keyPath.includes(term));
}

function scoreBodyCandidate(text, path) {
  let score = text.length;

  if (/[가-힣]/.test(text)) {
    score += 40;
  }
  if (text.includes(" ")) {
    score += 20;
  }
  if (/[.!?]|다\.|요\.|습니다|입니다/.test(text)) {
    score += 40;
  }
  if (looksLikeUrl(text) || looksLikePath(text)) {
    score -= 200;
  }
  if (!looksLikeNaturalLanguage(text)) {
    score -= 120;
  }
  if (path.includes("content") || path.includes("body") || path.includes("htmlcontent") || path.includes("text") || path.includes("description")) {
    score += 35;
  }

  return score;
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value) || /padlet\.com\//i.test(value);
}

function looksLikePath(value) {
  return value.split("/").length >= 4 && !value.includes(" ");
}

function looksLikeNaturalLanguage(value) {
  const hasHangul = /[가-힣]/.test(value);
  const hasSpacing = value.includes(" ");
  const hasSentenceShape = /[.!?]|다\.|요\.|습니다|입니다/.test(value);
  return hasHangul && (hasSpacing || hasSentenceShape);
}

function extractTextValue(value) {
  if (typeof value === "string") {
    return decodeHtml(stripHtml(value)).replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(extractTextValue).filter(Boolean).join(" ").trim();
  }

  if (value && typeof value === "object") {
    const preferredKeys = ["text", "content", "body", "htmlContent", "description", "caption", "value", "label", "title", "subject"];
    for (const key of preferredKeys) {
      if (key in value) {
        const extracted = extractTextValue(value[key]);
        if (extracted) {
          return extracted;
        }
      }
    }

    return Object.values(value).map(extractTextValue).filter(Boolean).join(" ").trim();
  }

  return "";
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function toHtmlParagraphs(text) {
  return String(text || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function preview(value, maxLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
