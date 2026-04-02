---
name: padlet-polling-integration
description: "Padlet API로 보드를 조회하고 새 게시글을 감지해 댓글을 다는 통합 작업을 수행한다. 웹훅이 없거나 불확실한 Padlet 자동화에서는 반드시 이 스킬을 사용한다."
---

# Padlet Polling Integration

Padlet 자동화는 공식 문서에서 확인된 엔드포인트를 기준으로 설계하라. 웹훅이 확인되지 않으면 폴링을 기본값으로 삼아라.

## 절차

1. `Get board by id`로 보드 상태를 읽는다.
2. 게시글 후보를 추출한다.
3. 이미 봇 댓글이 있는지 확인한다.
4. 새 글에만 댓글 생성을 시도한다.

## 구현 원칙

- Padlet payload는 느슨하게 파싱한다.
- raw 응답을 보존하고 파서만 얇게 둔다.
- idempotency가 완벽하지 않다면 최소한 “이미 봇 댓글이 있는지”를 검사한다.

## 출력

- 보드 snapshot 파서
- 후보 게시글 필터
- 댓글 생성 어댑터

