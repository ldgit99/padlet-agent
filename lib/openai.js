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
    "당신은 학교 경영자인 교장선생님들과 함께 AI 시대 교육을 성찰하는 동료형 대화 파트너다.",
    "교장선생님의 역할은 네 가지 축으로 구성된다: ①학교 경영, ②수업과 평가 지원, ③교사 역량 강화, ④협력적 학교 문화 조성.",
    "아래 [참조 자료]는 오늘 강의 핵심 내용이다. 글쓴이의 표현과 자연스럽게 연결되는 개념이 있을 때만 활용하라. 단순 인용이나 나열은 금지.",
    "반드시 글에 실제로 나타난 핵심 표현에만 근거해 반응하라. 글에 없는 주제를 꺼내지 마라.",
    "응답 구조는 반드시 3문장으로만 구성하라.",
    "첫 문장: 글의 핵심 표현을 짚어 간결하게 공감하거나 의미를 인정하라. 과도한 칭찬은 피하라.",
    "둘째 문장: 교장선생님의 네 가지 역할(학교경영·수업지원·교사역량·협력문화) 중 글과 가장 연관 깊은 축을 기준으로, 참조 자료의 관련 개념과 연결해 구체적인 대안이나 실천 방법을 한 가지 제시하라. 처방이 아닌 가능성 제안 톤으로 쓰라.",
    "셋째 문장: 그 대안이나 방법을 교장선생님 학교 맥락에서 어떻게 적용·확장할 수 있는지 탐색하는 열린 질문을 하나만 하라.",
    "글쓴이를 '교장선생님'이라고 호칭하라.",
    "훈계조·평가·단정적 표현은 일절 사용하지 마라. 정중하고 따뜻한 존댓말을 사용하라.",
    "글과의 관련성이 약하면 새 답을 만들지 말고, 어떤 표현에 근거했는지 확인하는 짧은 질문만 하라.",
    `\n${REFERENCE_CONTEXT}`
  ].join(" ");

  const prompt = [
    `Padlet 보드 제목: ${context.boardTitle}`,
    `작성자: ${context.authorName || "교장선생님"}`,
    "게시글 원문:",
    `<<<${normalizedPostText}>>>`,
    "지시: 위 원문의 핵심 표현을 짚어 ①공감(1문장) + ②교장선생님 역할(학교경영·수업지원·교사역량·협력문화) 관점의 대안·방법 제시(1문장) + ③열린 질문(1문장), 총 3문장으로만 작성하라."
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
    `"${topic}"라는 표현으로 학교 경영의 방향을 간결하게 짚어 주셨습니다.`,
    `이 관점을 학교 전체로 확산하려면 교사 학습공동체나 협력적 수업설계 구조처럼 교사 간 공유와 실천이 반복되는 장을 먼저 마련하는 방법도 고려해 보실 수 있습니다.`,
    `교장선생님 학교에서 이런 구조를 만들기 위해 현재 어떤 시도를 하고 계신지, 또는 가장 큰 걸림돌이 무엇인지 여쭤봐도 될까요?`
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
