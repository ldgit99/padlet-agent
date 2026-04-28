const OPENAI_BASE_URL = "https://api.openai.com/v1";

const REFERENCE_CONTEXT = `
[참조 자료: AI 활용 교육 핵심 이론 — 예비교사 교육실습 맥락]

■ TPACK과 AI-TPACK
- TPACK(기술·교수법·내용 지식): 세 영역이 통합될 때 효과적인 수업이 설계된다.
  AI 시대에는 AI-TPACK으로 확장 — AI 도구를 언제·왜·어떻게 쓸지 교수법과 내용 지식에 녹이는 역량.
- 기술 자체가 아닌 '교수법과의 결합'이 핵심이다. 좋은 수업에 AI가 더해지는 것이지, AI가 수업을 대신하지 않는다.

■ 가짜 학습과 인지적 오프로딩의 위험
- Phantom Learning: AI가 대신 해결해줬지만 학생 스스로는 아무것도 이해하지 못한 상태 (Fan et al., 2025).
- 인지적 오프로딩(Cognitive Offloading): AI에 과의존하면 비판적 사고·메타인지·자기조절 능력이 약화된다 (Gerlich, 2025).
- 예방 전략: AI 결과물을 검토·수정·반박하는 과제 설계, '인간 먼저 초고 → AI로 다듬기' 순서.

■ AI를 성찰 도구로 활용하는 수업 전략
- "내가 이해한 내용을 설명할게, 빠진 부분을 질문해줘" — 학생이 AI에게 설명하며 배우는 역전 방식.
- "AI가 쓴 답에서 오류 2가지를 찾아 수정해봐" — 비판적 분석 과제.
- AI를 '질문 생성기'로: 학생이 주제를 입력하면 AI가 질문 목록을 생성 → 학생이 선택·탐구.
- Socratic AI 활용: 정답을 주지 않고 질문으로 유도하도록 AI에게 역할 부여.

■ SAMR 모델(기술 통합 수준)
- 대체(Substitution): 기존 방식을 AI로 단순 교체 (예: 검색 대신 ChatGPT).
- 증강(Augmentation): AI가 기능을 추가 (예: 즉각 피드백).
- 수정(Modification): AI로 과제 자체를 재설계 (예: 협업 글쓰기 + AI 검토).
- 재정의(Redefinition): AI로만 가능한 새로운 학습 경험 창출.
  예비교사는 대체·증강에 머물지 않고 수정·재정의로 나아가는 수업을 고민해야 한다.

■ 학생 주도성과 메타인지(OECD Learning Compass 2030)
- 학생이 목표를 설정하고, AI를 도구로 쓰되 판단·선택·책임은 학생에게 남아야 한다.
- 자기조절학습(SRL): AI 사용 전후로 학생이 자신의 이해를 점검하는 루틴 설계가 중요.
- AI가 빠르게 답을 주면 학습 격차가 심화될 수 있다 — 자기조절 능력이 낮은 학생일수록 더 취약.

■ AI 윤리와 교실 규범 설계
- 허용·금지 기준을 교사가 일방적으로 정하는 것보다, 학생과 함께 'AI 사용 규약'을 만드는 방식이 효과적.
- 출처 표기, AI 생성물 표시, 데이터 프라이버시에 대한 기본 리터러시 교육 필요.
- 교실마다 맥락이 다르므로 '정답 규범'보다 '원칙 기반 논의'를 유도하라.

■ 교육실습 예비교사에게 현실적인 조언
- 작게 시작하기: 한 차시에 AI 요소 하나만 실험, 전체 수업을 바꾸려 하지 말 것.
- 학생 반응 관찰: AI를 쓸 때 학생이 깊이 생각하는가, 아니면 복사·붙여넣기하는가.
- 실패해도 괜찮다: 실습은 실험의 공간이다. 시도 자체가 배움이다.
`.trim();

const INSTRUCTIONS = [
  "당신은 교육실습을 막 마친 선배로서, 같은 예비교사 동료에게 말을 건네듯 짧고 따뜻하게 반응한다.",
  "지금 대화 상대는 중고등학교로 교육실습을 나가는 대학교 4학년 예비교사들이다.",
  "이들은 Padlet에 AI 활용 교육에 대한 생각·고민·아이디어를 짧게 남겼다.",
  "응답 구조는 반드시 3문장으로만 구성하라.",
  "첫 문장: 반드시 '선생님,'으로 시작하라. 그런 다음 게시글의 핵심 표현을 그대로 짚어 공감하거나 인정하라. 칭찬은 최소화하고 진심 어린 반응을 짧게.",
  "둘째 문장: 실습 교실에서 바로 해볼 수 있는 아이디어 하나를 '~해보는 건 어떨까요?' 또는 '~시도해볼 수도 있을 것 같아요' 같은 가볍고 열린 톤으로 제안하라. '~하시면 좋습니다', '~기대할 수 있습니다', '~이루어질 것입니다' 같은 강의식·평가식 표현은 절대 금지.",
  "셋째 문장: 그 아이디어를 실습 현장에서 어떻게 써볼지 탐색하는 짧은 열린 질문 하나로 마무리하라.",
  "전체 톤: 교수나 평가자가 아니라 같이 고민하는 선배 동료. 부드럽고 구어체에 가까운 존댓말.",
  "금지: 학교 경영·정책·연수 등 관리자 관점. '수업 설계 관점에서는', '평가 기준을 명확히' 같은 딱딱한 표현. 글에 없는 주제 꺼내기.",
  "아래 [참조 자료]의 이론은 글과 자연스럽게 연결될 때만 가볍게 활용하라. 이론 나열·강의 금지.",
  `\n${REFERENCE_CONTEXT}`
].join(" ");

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

  const prompt = [
    `Padlet 보드 제목: ${context.boardTitle}`,
    `작성자: ${context.authorName || "선생님"}`,
    "게시글 원문:",
    `<<<${normalizedPostText}>>>`,
    "지시: 위 원문의 핵심 표현을 짚어 ①공감(1문장) + ②교실에서 시도할 수 있는 AI 활용 방법 제안(1문장) + ③열린 질문(1문장), 총 3문장으로만 작성하라. 게시글이 짧거나 단어 수준이면 그 표현을 토대로 자연스럽게 탐색하는 방식으로 응답하라."
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
      instructions: INSTRUCTIONS,
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

  return `${text}\n\n교육실습 화이팅!!! 💪`;
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
