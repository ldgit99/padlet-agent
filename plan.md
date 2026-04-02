# Padlet AI Feedback Agent Execution Plan

작성일: 2026-04-02  
목표: Padlet에 올라온 학습자 의견에 자동으로 AI 피드백 댓글을 달아주는 시스템을 GitHub + Vercel + OpenAI API 기반으로 구축하고, Harness Engineering 방식으로 운영 가능한 형태로 완성한다.

## 1. 최종 목표

완료 기준은 다음과 같다.

1. 학습자가 Padlet 게시글을 올리면 일정 주기 내에 AI 피드백 댓글이 자동 생성된다.
2. 피드백은 한국어, 3문장 이하, 교육적으로 안전한 톤을 유지한다.
3. 중복 댓글이 방지된다.
4. GitHub 저장소와 Vercel 배포가 연결되어 재배포가 자동화된다.
5. 하네스 구조(`.claude/agents`, `.claude/skills`)가 문서화되어 이후 기능 확장에 재사용 가능하다.

## 2. 현재 상태

이미 완료된 항목:

1. `research.md` 작성 완료
2. 하네스 에이전트 정의 작성 완료
3. 하네스 스킬 정의 작성 완료
4. Vercel 함수 스캐폴드 작성 완료
5. Padlet/OpenAI 연동용 최소 코드 작성 완료
6. 기본 JavaScript 문법 점검 완료

아직 남은 핵심 항목:

1. GitHub 저장소 초기화 및 업로드
2. Padlet 실제 API payload 검증
3. Vercel 프로젝트 연결 및 환경변수 설정
4. 실환경 동작 테스트
5. 중복방지/로그 저장 강화

## 3. 실행 전략

전체 작업은 6개 Phase로 진행한다.

1. 저장소 정리 및 GitHub 배포 준비
2. Padlet 실제 응답 검증과 통합 보정
3. OpenAI 피드백 품질/안전성 보정
4. Vercel 배포 및 Cron 설정
5. 통합 테스트
6. 운영 안정화

이 프로젝트는 한 번에 “완성품”을 만들기보다, 동작 가능한 MVP를 먼저 세우고 그 뒤 안정성을 보강하는 방식이 가장 적절하다.

## 4. Phase 1: 저장소 정리 및 GitHub 배포 준비

목표:
- 현재 작업 디렉토리를 GitHub 저장소로 올릴 수 있는 상태로 만든다.

세부 작업:

1. `.gitignore` 작성
- 제외 대상:
  - `.env`
  - `.vercel`
  - `node_modules`
  - 로그/임시 파일

2. `README.md` 보강
- 프로젝트 소개
- 환경변수 설명
- 로컬 실행 방법
- Vercel 배포 방법
- 제한 사항

3. 저장소 초기화
- `git init`
- 기본 브랜치 `main`
- 첫 커밋 생성

4. GitHub 원격 저장소 생성 및 push

완료 기준:

- GitHub 저장소에 현재 코드와 문서가 올라가 있다.

예상 리스크:

- 민감정보가 실수로 커밋될 수 있다.

대응:

- `.env.example`만 유지하고 실제 `.env`는 커밋 금지

## 5. Phase 2: Padlet 실제 응답 검증과 통합 보정

목표:
- Padlet 보드의 실제 API 응답 구조에 맞춰 파서를 보정한다.

세부 작업:

1. 테스트용 Padlet 보드 준비
- 교사용 테스트 보드 1개 생성
- 학생 역할 샘플 게시글 3~5개 작성

2. 실제 `Get board by id` 응답 수집
- 보드 응답 JSON 저장
- `posts`, `comments`, `included` 구조 확인

3. [lib/padlet.js](d:/OneDrive/Agent/padlet-agent/lib/padlet.js) 보정
- `extractPosts`
- `extractComments`
- `authorName`
- `createdAt`
- `postId` 매핑 검증

4. 댓글 생성 API shape 검증
- 현재 요청 body가 실제 Padlet API 요구 형식과 맞는지 확인
- 필요하면 body 구조 수정

5. 중복방지 1차 검증
- 같은 게시글에 이미 봇 댓글이 있을 때 다시 댓글을 달지 않는지 확인

완료 기준:

- 테스트 보드에서 새 게시글 후보 추출과 댓글 생성이 정상 동작한다.

예상 리스크:

- 보드 조회 응답에 posts/comments가 포함되지 않을 수 있다.

대응:

- 필요 시 별도 post 조회 전략을 추가
- raw payload 저장 기능을 유지

## 6. Phase 3: OpenAI 피드백 품질 및 안전성 보정

목표:
- 실제 학생 게시글에 대해 쓸 만한 피드백 품질을 확보한다.

세부 작업:

1. 테스트 데이터셋 작성
- 짧은 의견
- 근거가 있는 의견
- 틀린 주장
- 무성의한 한 줄 글
- 민감하거나 공격적인 입력

2. 프롬프트 튜닝
- 인정 문장
- 구체적 피드백
- 다음 질문
- 3문장 제한

3. Moderation 정책 점검
- 입력 moderation 결과별 분기 기준 정의
- 어떤 카테고리에서 teacher review로 넘길지 문서화

4. 출력 품질 점검
- 너무 장황한 응답
- 답을 단정하는 응답
- 학생을 평가/비난하는 응답
- 모호한 칭찬만 있는 응답

5. 필요 시 구조화 출력 도입
- 이후 버전에서 `praise`, `feedback`, `next_step`, `escalate` 같은 JSON 출력을 사용하도록 확장 검토

완료 기준:

- 대표 테스트 입력 10개 이상에서 교육적으로 무난한 피드백이 생성된다.

예상 리스크:

- 모델이 과도하게 정답을 말하거나 너무 일반적인 피드백을 줄 수 있다.

대응:

- 시스템 프롬프트 강화
- 예시 기반 튜닝
- teacher-review fallback 유지

## 7. Phase 4: Vercel 배포 및 Cron 설정

목표:
- GitHub와 연결된 Vercel 배포를 완료하고 주기 실행을 설정한다.

세부 작업:

1. Vercel 프로젝트 생성
- GitHub 저장소 연결

2. 환경변수 설정
- `PADLET_API_KEY`
- `PADLET_BOARD_ID`
- `PADLET_BOT_DISPLAY_NAME`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CRON_SECRET`
- `POLL_LOOKBACK_MINUTES`
- `MAX_POSTS_PER_RUN`

3. Preview 환경 배포
- 수동 호출 테스트
- 응답 JSON 확인

4. Production 배포
- Cron 활성화
- 5분 주기 실행 확인

5. 인증 검증
- cron secret이 없을 때/있을 때 동작 방식 확인

완료 기준:

- Vercel production URL에서 함수가 정상 실행된다.
- Cron이 주기적으로 호출된다.

예상 리스크:

- Vercel 환경변수 누락
- Cron 호출 인증 실패

대응:

- 배포 체크리스트 사용
- Preview에서 먼저 검증

## 8. Phase 5: 통합 테스트

목표:
- 실제 end-to-end 흐름이 의도대로 동작하는지 검증한다.

테스트 시나리오:

1. 정상 글
- 학생이 일반 의견 게시
- AI 댓글 1회 생성

2. 짧은 글
- “좋아요”, “잘 모르겠어요” 같은 짧은 입력
- AI가 구체화 질문을 남김

3. 잘못된 주장
- AI가 정답을 단정하지 않고 근거를 다시 생각하게 유도

4. 민감 입력
- 일반 피드백 대신 검토 보류 또는 안전한 안내

5. 중복 실행
- 같은 글에 대해 Cron이 다시 돌더라도 댓글을 다시 달지 않음

6. 다수 게시글
- 한 번의 실행에서 여러 게시글 처리
- `MAX_POSTS_PER_RUN` 한도 확인

완료 기준:

- 주요 시나리오에서 기능, 안전성, 중복방지가 모두 기대대로 동작한다.

## 9. Phase 6: 운영 안정화

목표:
- MVP를 실제 수업 맥락에 넣어도 크게 흔들리지 않는 수준으로 보강한다.

세부 작업:

1. 로그 체계 보강
- 현재는 함수 응답 기반 로그
- 이후 Vercel 로그 + 외부 저장소 연동 검토

2. idempotency 강화
- 게시글 처리 이력 저장소 도입 검토
- 후보:
  - Vercel KV
  - Upstash Redis
  - Supabase

3. 교사용 운영 가이드 작성
- 어떤 유형의 글에 잘 반응하는지
- 위험 글은 어떻게 처리되는지
- 프롬프트 수정 포인트

4. 과목별 확장
- 국어/사회/과학 등 과목별 톤 분리
- 질문형/칭찬형/반박유도형 피드백 모드 추가

5. 다중 보드 지원
- 보드별 환경변수 또는 설정 테이블

완료 기준:

- 단일 보드 MVP를 넘어 재사용 가능한 서비스 골격이 확보된다.

## 10. 구현 우선순위

가장 먼저 해야 할 일:

1. `.gitignore` 추가
2. GitHub 저장소 초기화
3. Padlet 실제 payload 확인
4. `lib/padlet.js` 보정
5. Vercel preview 배포
6. 실보드 테스트

그다음 해야 할 일:

1. 프롬프트 튜닝
2. teacher-review 정책 보강
3. 로그/idempotency 강화

## 11. 역할 분담 기준

Harness Engineering 기준 권장 담당은 다음과 같다.

1. `padlet-feedback-orchestrator`
- 전체 일정과 산출물 통합

2. `padlet-integration-architect`
- Padlet API 검증
- 파서/댓글 작성 로직 보정

3. `feedback-safety-designer`
- 피드백 정책
- moderation 및 출력 규칙 정제

4. `deployment-ops`
- GitHub/Vercel 배포
- 환경변수/cron 구성

5. `qa-agent`
- 경계면 검증
- 시나리오 테스트

## 12. 작업 체크리스트

### 문서/저장소

- [ ] `.gitignore` 작성
- [ ] README 보강
- [ ] Git 저장소 초기화
- [ ] GitHub push

### Padlet 통합

- [ ] 실제 board payload 확인
- [ ] post/comment 파서 보정
- [ ] comment create body 검증
- [ ] 중복 댓글 방지 확인

### OpenAI

- [ ] moderation 동작 검증
- [ ] 프롬프트 튜닝
- [ ] 샘플 입력 10개 이상 테스트

### Vercel

- [ ] 환경변수 설정
- [ ] preview 배포
- [ ] production 배포
- [ ] cron 실행 확인

### QA

- [ ] 정상 흐름 테스트
- [ ] 민감 입력 테스트
- [ ] 중복 실행 테스트
- [ ] 실패 응답 테스트

## 13. 예상 일정

보수적으로 보면 다음 순서가 적절하다.

1일차:
- 저장소 정리
- GitHub 업로드
- Padlet 실제 응답 확인

2일차:
- Padlet 파서 보정
- OpenAI 피드백 튜닝

3일차:
- Vercel preview/prod 배포
- 통합 테스트

4일차:
- 안정화
- 운영 문서 보강

## 14. 성공 기준

이 계획이 성공했다고 볼 수 있는 기준:

1. 테스트 보드에서 자동 댓글이 안정적으로 생성된다.
2. 같은 글에 댓글이 중복으로 달리지 않는다.
3. 민감 입력에 대해 안전한 fallback이 작동한다.
4. GitHub push 후 Vercel 재배포가 자연스럽게 이어진다.
5. 하네스 구조를 기반으로 이후 기능 확장이 가능하다.

## 15. 바로 다음 액션

지금 바로 실행할 가장 좋은 다음 단계는 다음 3가지다.

1. `.gitignore`를 추가한다.
2. GitHub 저장소를 초기화하고 첫 커밋을 만든다.
3. 실제 Padlet 보드 응답을 확인해 `lib/padlet.js`를 맞춘다.

