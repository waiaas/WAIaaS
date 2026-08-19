# 506. owner 승인 서명이 승인 대상에 묶이지 않아 재사용된다

- **유형:** BUG
- **심각도:** CRITICAL
- **발견일:** 2026-08-18 (PR #416 리뷰)
- **상태:** FIXED (2026-08-19)
- **관련 패키지:** @waiaas/daemon
- **관련 이슈:** #504, #505 (같은 PR에서 함께 수정)

## 현상

한 번 캡처한 `(X-Owner-Signature, X-Owner-Message, X-Owner-Address)` 3종 헤더가 **그 지갑의 이후 모든 `PENDING_APPROVAL`을 승인한다.**

## 원인

`ownerAuth`는 두 가지만 확인한다.

1. 서명이 `X-Owner-Message`가 실어온 바이트에 대해 유효한가
2. `X-Owner-Address`가 지갑의 등록된 오너와 일치하는가

**서명 원문이 승인 대상 `:id`를 가리키는지는 확인하지 않는다.** approve 핸들러(`transactions.ts:1090`)도 서명을 그대로 전달할 뿐 다시 검사하지 않는다. `GET /v1/nonce`는 명시적으로 stateless라(`nonce.ts:7`) 서버가 발급한 nonce를 소비하거나 무효화하지 않는다. SIWE 경로도 `verifySIWE`가 nonce·domain을 `validateSiweMessage`에 넘기지 않아 viem이 `expirationTime`/`notBefore`만 강제한다.

### 실제 영향 범위

과장하지 않기 위해 경계를 적어 둔다. `/v1/transactions/*`는 여전히 sessionAuth 뒤에 있고, `approve()`는 열려 있고 만료되지 않은 `pending_approvals` 행을 요구하며 one-shot으로 뒤집는다. 따라서 **이미 처리된 트랜잭션을 다시 승인할 수는 없다.** 문제는 **그 지갑의 에이전트가 이후에 올리는 다른 건**을 승인할 수 있다는 것이고, 그것이 정확히 오너 승인이 막으라고 존재하는 경우다.

### 알려진 상태였다

`owner-auth-attacks.security.test.ts`의 `SEC-01-OA-08`이 이 동작을 **정상으로 고정**하고 있었다. 주석은 "in production, nonce-based replay protection should be added at the application layer"였다. 즉 취약점을 인지한 채 테스트로 못박아 둔 상태였다.

## 수정

**서명 원문이 승인 대상 id를 포함해야 한다.** 미들웨어가 서명 검증에 성공한 뒤, 디코딩된 텍스트에 라우트 param `:id`가 들어 있는지 확인한다. 없으면 `INVALID_SIGNATURE`로 거부한다.

`/v1/transactions/:id/approve`·`/reject`에서는 트랜잭션 id, `/v1/wallets/:id/owner/verify`에서는 지갑 id가 대상이다. 이로써 각 서명이 한 건 전용이 된다.

### 왜 nonce가 아니라 id 바인딩인가

nonce를 stateful하게 만들려면 발급·소비 저장소가 필요하고, 그것만으로는 "이 서명이 어느 건에 대한 것인가"를 답하지 못한다. **문제의 핵심은 재사용 횟수가 아니라 대상 불특정**이므로 id 바인딩이 직접적인 해법이다. one-shot 소비는 `approve()`가 이미 수행한다.

nonce를 서버가 소비하도록 만드는 것은 추가 방어로 여전히 유효하며 별도 과제로 남는다.

### 하위호환

**breaking change다.** 메시지에 id를 넣지 않던 기존 클라이언트는 401을 받는다. `security.owner_message_binding=false`로 끄면 이전 동작으로 돌아간다. 기본값은 `true` — 이 레포의 정책 기본값이 default-deny이므로 안전한 쪽을 기본으로 둔다.

## 테스트 항목

`owner-auth-attacks.security.test.ts`의 `SEC-01-OA-08`을 재작성했다.

1. 대상 id를 담지 않은 메시지의 서명은 거부된다
2. **다른 id에 바인딩된 서명을 이 경로에 쓰면 거부된다** (이 이슈가 막는 재사용)
3. 자기가 승인하는 id를 담은 서명은 통과한다

기존 `owner-auth.test.ts`·`owner-auth-siwe.test.ts`·`evm-lifecycle-e2e.test.ts`의 통과 경로도 전부 id를 담도록 갱신했다. 실사용에서도 그렇게 서명해야 한다.
