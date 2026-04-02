---
name: padlet-feedback-orchestrator
description: "Padlet 학습자 게시글 자동 AI 피드백 프로젝트를 전체 조율한다. Padlet, OpenAI, GitHub, Vercel을 함께 설계하거나 구현할 때 반드시 이 스킬을 사용한다."
---

# Padlet Feedback Orchestrator Skill

Padlet 자동 피드백 프로젝트를 오케스트레이션하라. 이 스킬은 개별 코드 작성보다 먼저 전체 흐름과 역할 분리를 맞추기 위해 사용한다.

## 실행 모드

에이전트 팀을 기본으로 사용한다.

## 에이전트 구성

| 팀원 | 역할 | 출력 |
|------|------|------|
| padlet-integration-architect | Padlet API 통합 | Padlet 어댑터, 폴링 규칙 |
| feedback-safety-designer | 피드백 안전성 | 프롬프트, moderation 규칙 |
| deployment-ops | 배포/운영 | Vercel/GitHub 설정 |
| qa-agent | 경계면 검증 | 위험 목록, 테스트 시나리오 |

## 워크플로우

1. 요구사항을 기능, 안전, 배포로 분해한다.
2. `_workspace/` 또는 문서 파일에 중간 산출물을 저장한다.
3. Padlet 통합과 안전성 설계를 병렬로 진행한다.
4. 배포 구조를 병렬로 설계한다.
5. QA로 경계면을 점검한다.
6. 최종 문서와 구현 파일을 생성한다.

## 산출물 우선순위

1. `research.md`
2. `.claude/agents/*`
3. `.claude/skills/*`
4. 실행 스캐폴드

## 테스트 시나리오

정상 흐름:
- 학생 글이 새로 올라오면 주기 실행 후 댓글이 1회 생성된다.

에러 흐름:
- Padlet 응답 shape가 달라도 프로세스가 전체 중단되지 않고 실패 원인을 남긴다.

