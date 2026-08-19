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

**서명 원문이 `action:id` 토큰을 포함해야 한다.** 미들웨어가 서명 검증에 성공한 뒤, 디코딩된 텍스트에 라우트 param `:id`가 들어 있는지 확인한다. 없으면 `INVALID_SIGNATURE`로 거부한다.

| 엔드포인트 | 요구 토큰 |
| --- | --- |
| `POST /v1/transactions/{id}/approve` | `approve:{id}` |
| `POST /v1/transactions/{id}/reject` | `reject:{id}` |
| `POST /v1/wallets/{id}/owner/verify` | `verify:{id}` |

### 왜 id만이 아니라 `action:id`인가 (2026-08-19 감사 반영)

처음 구현은 `signedText.includes(paramId)`로 id만 확인했다. 독립 감사가 **`/approve`와 `/reject`의 `:id`가 같은 txId**라는 점을 짚었다. 즉 오너가 **거부하려고** 서명한 `Reject {txid}`가 `/approve`에서 그대로 200이 됐다(감사 재현: `H2 approve-with-reject-signature status: 200`). 대상 불특정은 닫았지만 **행위 불특정**이 남아 있었고, 문서 예시가 이미 `Approve <id>` / `Reject <id>`로 갈라져 있어 오히려 위험했다.

토큰 방식은 부수 효과로 **언어 독립성**도 준다. 산문에 영어 동사가 있어야 한다면 한국어 승인 문구(#504가 가능하게 만든 것)와 충돌한다. 토큰은 문구 어디에나 놓을 수 있고 매칭은 대소문자를 무시한다.

`action`은 미들웨어 마운트 시점에 주입한다(`createOwnerAuth({ action })`). 경로 말단 세그먼트 파싱보다 명시적이고, 라우트 구조가 바뀌어도 조용히 깨지지 않으며, 타입이 필수라 새 마운트에서 빠뜨릴 수 없다.

### SDK가 함께 깨졌다 (2026-08-19 감사 반영)

`packages/sdk/src/owner-client.ts`가 **nonce만 서명해** `X-Owner-Message`에 넣고 있었다. id도 action도 없으므로 바인딩 도입으로 `approve()`·`reject()`가 **100% 401**이 된다. SDK 테스트는 `fetch`를 mock해 데몬 검증을 거치지 않으므로 이 회귀를 잡지 못했다(감사 확인: 13/13 green).

`ownerAuthHeaders(action, boundId)`로 바꿔 `{action}:{id} (nonce: {nonce})`를 서명한다. nonce는 유지했다 — 같은 id에 대한 두 승인이 바이트 단위로 동일해지지 않게 한다. SDK 테스트에도 토큰 포함 단정을 추가해, mock 기반 테스트가 같은 회귀를 다시 놓치지 않게 했다.

`activateKillSwitch()`는 `:id`가 없는 라우트라 바인딩 대상이 없다. 그 경로는 별개의 pre-existing 결함으로 현재 ownerAuth를 통과하지 못하므로(`c.req.param('id')`가 undefined → `WALLET_NOT_FOUND`) 이번 범위에 넣지 않고 주석으로 남겼다.

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

`owner-auth.test.ts`에 action 바인딩 4건을 추가했다.

4. **거부용 서명을 승인 마운트에 쓰면 거부된다** (감사 결함 2)
5. 한국어 프롬프트 안에 토큰이 섞여 있어도 통과한다
6. 토큰 매칭은 대소문자를 무시한다
7. action 없이 id만 있는 메시지는 거부된다

`owner-client.test.ts`에 SDK 바인딩 3건을 추가했다(토큰 포함, reject/approve 구분, 서명한 바이트와 전송 바이트 일치).

되돌림 검증: 토큰을 id만으로 되돌리면 4·7이 실패하고, SDK를 nonce만 서명으로 되돌리면 SDK 3건이 실패한다.

기존 `owner-auth.test.ts`·`owner-auth-siwe.test.ts`·`evm-lifecycle-e2e.test.ts`의 통과 경로도 전부 id를 담도록 갱신했다. 실사용에서도 그렇게 서명해야 한다.
