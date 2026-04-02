const OPENAI_BASE_URL = "https://api.openai.com/v1";

export async function moderateText(config, input) {
  const response = await fetch(`${OPENAI_BASE_URL}/moderations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI moderation failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  const result = payload?.results?.[0] || {};
  return {
    flagged: Boolean(result.flagged),
    categories: result.categories || {}
  };
}

export async function generateFeedback(config, context) {
  const instructions = [
    "당신은 학습자의 사고를 돕는 친절한 교사 보조 AI다.",
    "답을 단정하지 말고, 학생의 관찰을 짧게 인정한 뒤 다음 생각거리를 제안하라.",
    "한국어로 답하라.",
    "반드시 3문장 이하로 답하라.",
    "형식: 1) 인정 2) 구체적 피드백 3) 다음 질문 또는 다음 단계",
    "위험하거나 민감한 내용은 일반 조언 대신 '선생님과 함께 확인해보자'는 방향으로 유도하라."
  ].join(" ");

  const prompt = [
    `Padlet 보드 제목: ${context.boardTitle}`,
    `작성자: ${context.authorName || "학습자"}`,
    "학습자 게시글:",
    context.postText
  ].join("\n");

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openAiModel,
      instructions,
      input: prompt
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI response generation failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  const text = extractText(payload).trim();

  if (!text) {
    throw new Error("OpenAI returned an empty feedback message");
  }

  return text;
}

function extractText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string") {
        chunks.push(block.text);
      }
    }
  }

  return chunks.join("\n");
}
