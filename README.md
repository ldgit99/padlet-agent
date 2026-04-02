# Padlet AI Feedback Agent

Padlet 게시글을 주기적으로 읽고, OpenAI로 교육용 피드백을 생성한 뒤 Padlet 댓글로 남기는 Vercel 함수 스캐폴드입니다.

## 포함 내용

- `api/poll-padlet-feedback.js`: Vercel Cron 진입점
- `lib/padlet.js`: Padlet 조회/댓글 작성 어댑터
- `lib/openai.js`: OpenAI Responses + Moderation 호출
- `.claude/agents`, `.claude/skills`: Harness Engineering용 에이전트/스킬 정의
- `research.md`: 설계 근거와 운영 판단

## 빠른 시작

1. `.env.example`을 참고해 환경변수를 설정한다.
2. GitHub 저장소를 만든 뒤 이 폴더를 push한다.
3. Vercel에서 저장소를 연결한다.
4. `vercel.json`의 cron이 `/api/poll-padlet-feedback`를 호출하도록 둔다.
5. Padlet API key와 board id를 넣고 동작을 검증한다.

## 주의

- 현재 구현은 Padlet payload를 유연하게 파싱하는 방식을 사용한다.
- 실제 운영 전에는 대상 보드의 실제 JSON shape를 확인해 `extractPosts` / `extractComments`를 보정하는 것이 좋다.

