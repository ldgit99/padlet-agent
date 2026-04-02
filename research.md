# Padlet AI Feedback Agent Research

작성일: 2026-04-02  
목표: 학습자가 Padlet에 의견을 올리면 자동으로 AI 피드백을 댓글로 남기는 에이전트를, Harness Engineering 방식으로 설계하고 GitHub + Vercel + OpenAI API 기반으로 배포 가능한 형태로 정리한다.

## 1. 결론 요약

- 가장 현실적인 1차 아키텍처는 `Padlet 보드 폴링 -> 후보 글 추출 -> 안전성 검사 -> OpenAI 피드백 생성 -> Padlet 댓글 작성 -> 중복방지` 흐름이다.
- 현재 확인한 Padlet 공식 API 문서에서는 `Create a comment`, `Create a post`, `Get board by id` 등은 보이지만, 학습자 글 등록 이벤트를 직접 밀어주는 공식 웹훅 엔드포인트는 확인하지 못했다.
- 따라서 서버리스 환경에서는 `Vercel Cron Jobs`로 주기 폴링하는 방식이 가장 단순하고 운영 가능성이 높다.
- 교육용 자동 피드백은 즉시성, 개인화, 교사 업무 경감 측면의 장점이 있지만, 환각, 부적절한 언어, 과잉확신, 학생 자율성 저해 위험이 있어 `입력 moderation + 출력 규칙 + teacher override`가 필요하다.
- Harness Engineering 관점에서는 단일 거대 프롬프트보다 `오케스트레이터 + Padlet 통합 + 피드백 안전성 + 배포/운영 + QA`로 역할을 분리하는 편이 유지보수와 확장성에 유리하다.

## 2. 최신 근거 정리

### 2-1. Padlet API

- Padlet 공식 API 문서에는 인증 방식으로 `X-API-KEY` 헤더 사용이 안내되어 있다.
- 엔드포인트 목록에는 `Get board by id`, `Create a comment`, `Create a post`, `Create a reaction` 등이 보인다.
- 확인한 범위에서는 웹훅 관련 공식 문서가 보이지 않았다.  
  추론: 새 글 감지를 위해서는 `Get board by id` 기반 폴링 설계가 안전하다.

### 2-2. OpenAI API

- OpenAI는 최신 범용 응답 인터페이스로 `Responses API`를 제공한다.
- `Structured Outputs`는 JSON Schema 기반 형식 강제를 지원하므로, 피드백을 `tone`, `praise`, `next_step`, `risk_flag` 같은 구조화된 결과로 받기에 적합하다.
- `Moderations` API는 유해성 분류 결과를 반환하므로, 학생 입력 검토와 모델 출력 후처리에 모두 사용할 수 있다.

### 2-3. Vercel

- Vercel 공식 문서 기준 `Cron Jobs`는 함수 경로를 스케줄 기반으로 호출할 수 있다.
- 이 구조는 Padlet 웹훅이 없을 때 폴링성 백그라운드 작업에 잘 맞는다.
- GitHub 연동 배포와 환경변수 관리가 쉬워 초기 운영 비용이 낮다.

### 2-4. 교육 연구

- 2024년 체계적 문헌고찰은 GenAI 기반 자동 피드백이 다양한 고등교육 맥락에서 빠르고 개인화된 피드백 제공, 교원 업무 경감 가능성을 보여준다고 정리했다.
- 2024년 AI-매개 언어학습 체계적 문헌고찰은 AI가 자기조절학습과 메타인지 지원 도구로 기능할 가능성을 제시했다.
- 다만 연구 전반의 공통 리스크는 정확도, 피드백 품질의 일관성, 과의존, 맥락 부정합이다.  
  추론: 교육용 Padlet 피드백 에이전트는 “정답 제시자”보다 “성찰을 유도하는 코치” 역할로 설계하는 편이 안전하다.

## 3. 권장 제품 아키텍처

## 이벤트 흐름

1. 학습자가 Padlet 게시글 작성
2. Vercel Cron이 `/api/poll-padlet-feedback` 호출
3. 함수가 Padlet `Get board by id`로 보드 상태 조회
4. 새 게시글 후보만 추출
5. 기존 AI 댓글 존재 여부 확인
6. 학생 글을 OpenAI Moderation으로 1차 검사
7. Responses API로 교육용 피드백 생성
8. 필요 시 출력도 다시 안전 규칙 검사
9. Padlet `Create a comment`로 댓글 등록
10. 실행 로그를 응답 JSON 또는 외부 로그 저장소에 남김

## 데이터 원칙

- 학생 개인정보는 최소화한다.
- OpenAI로 보내는 입력은 가능한 한 게시글 본문과 최소 메타데이터만 포함한다.
- 학번, 이메일, 실명 같은 식별자는 프롬프트에 포함하지 않는다.

## 피드백 원칙

- 짧고 친절하게 쓴다.
- 학생의 관찰이나 주장을 먼저 인정한다.
- 정답 단정 대신 근거 질문이나 다음 탐구 단계를 제안한다.
- 민감 주제, 공격적 표현, 자해/타해 신호가 있으면 일반 피드백 대신 교사 검토 플래그를 남긴다.

## 4. Harness Engineering 적용안

### 4-1. 팀 구조

권장 패턴: `감독자 + 팬아웃/팬인 + 생성-검증`

에이전트 구성:

1. `padlet-feedback-orchestrator`
- 전체 워크플로우 조율
- 입력 요구사항 정리
- 팀 산출물 통합

2. `padlet-integration-architect`
- Padlet API 조회/댓글 작성
- 중복방지 규칙
- 폴링 전략

3. `feedback-safety-designer`
- 프롬프트, 출력 형식, 안전정책
- moderation 및 teacher escalation 규칙

4. `deployment-ops`
- GitHub 저장소 구조
- Vercel 배포
- 환경변수, cron, 관측성

5. `qa-agent`
- 경계면 검증
- Padlet payload shape, OpenAI 응답 shape, 댓글 중복 여부 확인

### 4-2. 오케스트레이터 순서

1. 요구사항 입력 정리
2. `_workspace/`에 조사/설계 산출물 저장
3. Padlet 통합 설계와 피드백 안전성 설계를 병렬 수행
4. 배포/운영 설계를 병렬 수행
5. QA가 각 산출물의 경계면과 누락 항목 검토
6. 최종 아키텍처, 코드, 배포 문서 생성

### 4-3. 이 프로젝트에 맞는 하네스 판단

- 에이전트가 2개 이상이며 서로 발견 공유가 중요하므로 에이전트 팀 모드가 적합하다.
- 특히 “Padlet API 제약”과 “교육 피드백 안전성”은 서로 강하게 영향을 주므로, 팀원 간 직접 통신이 품질을 높인다.

## 5. GitHub + Vercel + OpenAI 운영 설계

## GitHub

- 기본 브랜치: `main`
- 개발 브랜치: `develop` 또는 기능 브랜치 기반 PR
- 최소 CI:
  - lint
  - basic smoke test
  - env presence check
- PR 템플릿에 다음 포함:
  - 학생 안전성 영향
  - 프롬프트 변경 여부
  - Padlet API shape 변경 여부

## Vercel

- 프로젝트를 GitHub 저장소와 연결
- Preview/Production 환경 분리
- Cron 예시: `*/5 * * * *`
- API 경로 예시: `/api/poll-padlet-feedback`
- 보호용 시크릿:
  - `CRON_SECRET`
  - `PADLET_API_KEY`
  - `PADLET_BOARD_ID`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `PADLET_BOT_DISPLAY_NAME`

## OpenAI

- 모델 선택:
  - 기본 피드백 생성: 빠른 최신 범용 모델
  - 더 중요한 과제용: 품질 우선 모델
- 권장 호출 순서:
  1. 입력 moderation
  2. structured feedback generation
  3. 필요 시 출력 검사

## 6. 리스크와 대응

### A. Padlet API shape 불확실성

- 위험: 보드 조회 결과에 posts/comments 구조가 예상과 다를 수 있다.
- 대응: 파서 계층을 얇게 두고 raw payload를 보존한다.

### B. 댓글 중복 생성

- 위험: Cron 중복 호출, 재시도, 타임아웃 시 같은 게시글에 여러 번 댓글이 달릴 수 있다.
- 대응:
  - 기존 댓글 중 `botDisplayName` 검사
  - 최근 처리한 post id 캐시
  - idempotency key 저장소 추가 고려

### C. 부적절한 피드백

- 위험: 모욕적, 단정적, 교육적으로 부정확한 피드백
- 대응:
  - moderation
  - 엄격한 시스템 프롬프트
  - teacher-review fallback

### D. 학습자 과의존

- 위험: 학생이 답을 복사하는 방향으로 사용
- 대응:
  - 직접 답안보다 질문형/힌트형 피드백 우선
  - “다음에 생각해볼 점” 중심 출력

## 7. 권장 MVP 범위

1. 단일 Padlet 보드 지원
2. 텍스트 게시글만 처리
3. 게시글당 댓글 1회만 생성
4. 교사용 고정 톤 프롬프트 1종
5. Vercel Cron 5분 주기
6. 실패 시 JSON 로그만 남기고 재시도는 다음 주기에 맡김

MVP 이후:

1. 과목별 프롬프트 분기
2. 교사 승인 큐
3. 대시보드
4. 다중 보드 운영
5. Vercel KV 또는 DB 기반 idempotency/logging

## 8. 이 저장소에 바로 반영한 내용

- Harness Engineering 스타일의 `.claude/agents/*` 정의
- `.claude/skills/*` 오케스트레이터와 도메인 스킬
- Vercel serverless 스캐폴드
- Padlet/OpenAI 연동용 최소 코드

## 9. 소스

- Harness Engineering repo: https://github.com/tigerjk9/Harness-Engineering
- Padlet Authentication: https://docs.padlet.dev/reference/authentication
- Padlet API Reference overview: https://docs.padlet.dev/reference/authentication
- Padlet Create a comment: https://docs.padlet.dev/reference/comments
- Padlet Error handling & rate limiting: https://docs.padlet.dev/reference/error-handling
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses/compact?api-mode=responses
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs?api-mode=chat
- OpenAI Moderations: https://platform.openai.com/docs/api-reference/moderations/create?lang=node.js
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Lee & Moore (2024), systematic review: https://eric.ed.gov/?id=EJ1446868
- Chang & Sun (2024), systematic review: https://www.sciencedirect.com/science/article/pii/S0346251X24002665

