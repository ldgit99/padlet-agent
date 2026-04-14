const OPENAI_BASE_URL = "https://api.openai.com/v1";

// 발표자료 핵심 내용 — 피드백 생성 시 참조 컨텍스트로 주입
const REFERENCE_CONTEXT = `
[참조 자료: AI 시대 교육 대전환, 학교 교육의 미래 — 이동국(경북대학교)]

■ AI 시대 교사 핵심 역량
- Human-AI Agency: 인간과 AI가 상호작용 속에서 함께 의사결정하는 공동 행위 주체성.
  AI를 도구로 보는 기존 관점과 달리, AI를 파트너로 삼되 방향설정·해석·최종 책임은 인간(교사)에게 남긴다.
- AI 오케스트레이션: AI로 단순히 답을 얻는 것이 아니라, 질문·비교·의심·선택·책임의 과정을 설계하는 역량.
  단순 AI 활용(복사→제출)과 달리 깊은 학습과 고차원적 사고를 이끈다.
- 문제 정의 능력: 무엇을 AI에게 맡기고 무엇을 인간이 할지 구분하는 판단력.
- 수업 설계 역량: 수업 전 Human-AI Agency를 구조화하고, 수업 중 조율·수업 후 성찰하는 전문적 행동.
- TPACK(기술 교수 내용 지식): 기술·교수법·내용 지식이 통합된 복합 역량. AI 시대에는 AI-TPACK으로 확장.
- 인지적 주권 보호: 분산인지의 이점을 활용하되, 학습자의 비판적 사고·자기조절·메타인지가 약화되지 않도록 설계.

■ AI 남용의 위험(연구 기반)
- 가짜 학습(Phantom Learning): AI가 다 해줬지만 진짜 이해 없음 (Fan et al., 2025; Jose et al., 2025)
- 인지적 오프로딩: AI 과의존 → 비판적 사고력 저하 (Benedek & Sziklai, 2025; Gerlich, 2025)
- 미루기·자기조절 약화: AI를 마감 해결사로 사용 → 메타인지·자기동기 약화 (Lahmer, 2025)
- 학습 격차 심화: 자기조절 능력 높은 학생에게만 효과 집중

■ 바람직한 AI 활용 전략
- AI를 성찰 도구로: "내가 이해한 내용을 설명할 테니, 빠진 부분을 질문해줘"
- AI 결과물 비판: "AI가 쓴 답의 오류 2가지를 찾아 수정해 보기"
- 인간이 먼저, AI는 보완: 초고는 인간이 쓰고 다듬기만 AI에게
- 역할 명시: AI=질문 생성/대안 제시, 학생=판단·선택·책임

■ 협력적 학교 문화 조성
- '도구 도입'이 아닌 '시스템 전환'의 관점으로 접근 (총체적 접근)
- 혁신 확산(Rogers, 1962): 혁신가→초기수용자→초기다수→후기다수→지각수용자의 S곡선
  캐즘 극복 전략: 성공 사례 제시, 기술+알파 제공, 리스크 최소화 메시지
- 협력적 수업설계 5원리: ①상호 의존 ②인지 분산 ③활성화 ④외현화 ⑤조정
- 느슨한 학습공동체: 월 1회 자율 참여 모임, 교사 간 연결(관계) 강화
- Human-AI 협력 설계에서 AI는 교사를 대체하지 않고, 교사 간 협력을 확장하는 참여자로 기능

■ SAMR 모델(기술 통합 수준): 증강→대체→수정→재정의
■ OECD Learning Compass 2030: 학생이 목표를 설정하고 능동적으로 행동하며 결과에 책임지는 학생 주도성
`.trim();

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
    "아래 [참조 자료]는 오늘 강의 핵심 내용이다. 게시글의 주제와 관련된 개념·연구·전략이 있다면 자연스럽게 연결하라.",
    "단, 참조 자료를 단순 인용하거나 나열하지 말고, 글쓴이의 표현과 연결되는 지점에서만 활용하라.",
    "반드시 글에 실제로 나타난 핵심 표현이나 핵심 주장에 직접 반응하라.",
    "게시글에 없는 주제나 일반론으로 새 화제를 꺼내지 마라.",
    "평가나 판정보다 교육적 확장을 돕는 피드백을 제공하라.",
    "정중하고 친절한 존댓말로 답하라.",
    "반드시 3문장 이하로 답하라.",
    "첫 문장에서는 글의 핵심 표현을 짚으면서 의미 있는 관점을 인정하라.",
    "둘째 문장에서는 수업 설계, 학생 이해, 평가, 질문 설계, 상호작용 중 하나와 연결해 전문적 시사점을 제안하라. 참조 자료의 관련 개념(예: Human-AI Agency, 인지적 오프로딩, SAMR, 협력적 수업설계 원리 등)을 활용해도 좋다.",
    "셋째 문장에서는 교사의 성찰을 확장하는 질문이나 다음 탐색 포인트를 제안하라.",
    "글쓴이를 학생처럼 대하지 말고, 동료 교사에게 드리는 피드백처럼 쓰라.",
    "단정적 비판, 훈계조 표현, 과도한 칭찬만 있는 일반론은 피하라.",
    "글과의 관련성이 약하면 새 답을 만들지 말고, 글의 어떤 표현에 근거했는지 먼저 확인하는 질문을 하라.",
    `\n${REFERENCE_CONTEXT}`
  ].join(" ");

  const prompt = [
    `Padlet 보드 제목: ${context.boardTitle}`,
    `작성자: ${context.authorName || "교사"}`,
    "교사 게시글 원문:",
    `<<<${normalizedPostText}>>>`,
    "지시: 위 원문에서 실제로 보이는 표현에만 근거해, 참조 자료의 관련 개념과 연결하여 교사의 교육적 전문성에 도움이 되는 동료형 피드백을 3문장 이하로 작성하라."
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
