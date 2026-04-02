const OPENAI_BASE_URL = "https://api.openai.com/v1";

export async function moderateText(config, input) {
  console.log(`OpenAI moderation: ${OPENAI_BASE_URL}/moderations`);

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
  const normalizedPostText = String(context.postText || "").trim();

  if (normalizedPostText.length < 12) {
    return buildShortPostFeedback(normalizedPostText);
  }

  const instructions = [
    "당신은 교사의 성찰과 수업 전문성 성장을 돕는 동료형 AI 코치다.",
    "반드시 글에 실제로 나타난 핵심 표현이나 핵심 주장에 직접 반응하라.",
    "게시글에 없는 주제나 일반론으로 새 화제를 꺼내지 마라.",
    "평가나 판정보다 교육적 확장을 돕는 피드백을 제공하라.",
    "정중하고 친절한 존댓말로 답하라.",
    "반드시 3문장 이하로 답하라.",
    "첫 문장에서는 글의 핵심 표현을 짚으면서 의미 있는 관점을 인정하라.",
    "둘째 문장에서는 수업 설계, 학생 이해, 평가, 질문 설계, 상호작용 중 하나와 연결해 전문적 시사점을 제안하라.",
    "셋째 문장에서는 교사의 성찰을 확장하는 질문이나 다음 탐색 포인트를 제안하라.",
    "글쓴이를 학생처럼 대하지 말고, 동료 교사에게 드리는 피드백처럼 쓰라.",
    "단정적 비판, 훈계조 표현, 과도한 칭찬만 있는 일반론은 피하라.",
    "글과의 관련성이 약하면 새 답을 만들지 말고, 글의 어떤 표현에 근거했는지 먼저 확인하는 질문을 하라."
  ].join(" ");

  const prompt = [
    `Padlet 보드 제목: ${context.boardTitle}`,
    `작성자: ${context.authorName || "교사"}`,
    "교사 게시글 원문:",
    `<<<${normalizedPostText}>>>`,
    "지시: 위 원문에서 실제로 보이는 표현에만 근거해, 교사의 교육적 전문성에 도움이 되는 동료형 피드백을 3문장 이하로 작성하라."
  ].join("\n");

  console.log(`OpenAI responses: ${OPENAI_BASE_URL}/responses`);

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openAiModel,
      instructions,
      input: prompt,
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

function buildShortPostFeedback(postText) {
  const topic = postText || "이 관점";

  return [
    `"${topic}"라는 표현으로 교육의 중심을 분명히 잡아 주신 점이 인상적입니다.`,
    `이 관점을 실제 수업에서 구현하려면 어떤 장면에서 ${topic}이 우선되어야 하는지까지 드러나면 교육적 메시지가 더 선명해질 것 같습니다.`,
    `${topic}이 수업 목표, 활동, 평가 중 어디에서 가장 먼저 반영되어야 한다고 보시는지 한 가지 사례로 풀어 주실 수 있을까요?`
  ].join(" ");
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
