const PADLET_BASE_URL = "https://api.padlet.dev/v1";

export async function fetchBoardSnapshot(config) {
  const response = await fetch(`${PADLET_BASE_URL}/boards/${config.boardId}`, {
    headers: {
      "X-API-KEY": config.padletApiKey,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Padlet board fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  return {
    raw: payload,
    boardTitle: payload?.data?.attributes?.title || "Untitled board",
    posts: extractPosts(payload),
    comments: extractComments(payload)
  };
}

export function getCandidatePosts(snapshot, config) {
  const cutoff = Date.now() - config.pollLookbackMinutes * 60 * 1000;

  return snapshot.posts.filter((post) => {
    if (!post.text) {
      return false;
    }

    if (!post.createdAt) {
      return true;
    }

    return new Date(post.createdAt).getTime() >= cutoff;
  });
}

export function hasExistingBotFeedback(snapshot, postId, botDisplayName) {
  return snapshot.comments.some((comment) => {
    return comment.postId === postId && normalize(comment.authorName) === normalize(botDisplayName);
  });
}

export async function createComment(config, postId, text) {
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
          htmlContent: toHtmlParagraphs(text)
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
  return collectNodes(payload, "post").map((node) => ({
    id: node.id,
    text:
      node.attributes?.content ||
      node.attributes?.body ||
      node.attributes?.htmlContent ||
      node.attributes?.subject ||
      node.attributes?.title ||
      "",
    createdAt: node.attributes?.createdAt || node.attributes?.created_at || null,
    authorName:
      node.attributes?.authorName ||
      node.relationships?.author?.data?.id ||
      "unknown"
  }));
}

function extractComments(payload) {
  return collectNodes(payload, "comment").map((node) => ({
    id: node.id,
    postId:
      node.relationships?.post?.data?.id ||
      node.attributes?.postId ||
      node.attributes?.post_id ||
      "",
    body:
      node.attributes?.htmlContent ||
      node.attributes?.body ||
      node.attributes?.content ||
      "",
    authorName:
      node.attributes?.authorName ||
      node.relationships?.author?.data?.id ||
      "unknown"
  }));
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

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
