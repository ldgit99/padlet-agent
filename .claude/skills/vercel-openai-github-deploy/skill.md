---
name: vercel-openai-github-deploy
description: "GitHub 저장소에 올리고 Vercel로 배포하며 OpenAI API 환경변수를 구성하는 작업을 수행한다. 이 조합의 배포 문서를 만들거나 설정 파일을 수정할 때 사용한다."
---

# Vercel OpenAI GitHub Deploy

이 스킬은 Padlet 자동 피드백 프로젝트를 GitHub와 Vercel로 운영 가능한 형태로 정리한다.

## 절차

1. 저장소 루트에 `vercel.json`과 env 예시를 둔다.
2. GitHub 연결 배포를 전제로 폴더 구조를 단순하게 유지한다.
3. 시크릿은 코드에 넣지 않고 환경변수로만 처리한다.
4. cron 경로와 보호용 secret을 함께 설계한다.

## 필수 env

- `PADLET_API_KEY`
- `PADLET_BOARD_ID`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CRON_SECRET`

## 운영 체크

- preview/prod 환경 분리
- 호출 주기 검토
- 장애 시 로그 확인 경로 확보

