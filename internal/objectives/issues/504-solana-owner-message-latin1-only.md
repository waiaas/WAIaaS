# 504. Solana owner 승인 문구를 HTTP 헤더로만 받아 한 줄 ASCII로 제한된다

- **유형:** ENHANCEMENT
- **심각도:** MEDIUM
- **발견일:** 2026-08-13
- **상태:** FIXED (2026-08-18)
- **관련 패키지:** @waiaas/daemon

## 현상

Solana 지갑에서 owner 승인 서명을 받을 때, 사람이 지갑 팝업에서 읽는 문구를 **한 줄 ASCII로만** 만들 수 있다. 한글이나 줄바꿈을 넣으면 요청 자체가 만들어지지 않는다(실측: 502).

승인 팝업의 문구는 오너가 "무엇을 허락하는가"를 판단하는 유일한 근거이므로, 이 제약은 UX에 직접 걸린다. `Approve tx 01958f3c` 같은 문구밖에 못 쓴다.

## 원인

데몬이 서명 원문을 `X-Owner-Message` **HTTP 헤더**로 받는다(`packages/daemon/src/api/middleware/owner-auth.ts`). HTTP 헤더 값은 latin1 범위이고 개행을 담을 수 없다.

EVM 경로는 이 문제를 이미 해결해 두었다. SIWE(EIP-4361) 메시지가 정의상 여러 줄이라 raw로는 헤더에 실을 수 없어서, **base64로 받아 디코딩**한다.

```ts
// EVM
const decodedMessage = Buffer.from(message, 'base64').toString('utf8');

// Solana
const messageBytes = Buffer.from(message, 'utf8');   // 헤더 값을 그대로 사용
```

즉 필요한 경로가 한쪽에만 있었다.

## 수정

Solana 경로에 **옵트인 base64**를 연다. `X-Owner-Message-Encoding: base64`를 보내면 디코딩한 바이트로 검증한다.

| 헤더 | 동작 |
| --- | --- |
| 생략 | 기존 raw UTF-8 (하위호환) |
| `utf8` | 기존 raw UTF-8 (명시) |
| `base64` | 디코딩 후 검증 |
| 그 외 | 401 INVALID_SIGNATURE, 값을 메시지에 담아 반환 |

### 왜 옵트인인가

**기각한 대안 ① 자동 감지** (base64로 파싱되면 base64로 간주): ASCII 문구가 우연히 유효한 base64 문자열인 경우가 흔하다. 그러면 엉뚱한 바이트로 검증해 서명 불일치만 발생하고, 호출자는 원인을 알 방법이 없다. 조용한 실패를 만드는 설계다.

**기각한 대안 ② base64 강제** (EVM처럼): 기존 클라이언트가 전부 깨진다. EVM은 처음부터 강제였기에 가능했지만 Solana는 이미 raw로 쓰이고 있다.

알 수 없는 인코딩 값을 거부하는 것도 같은 이유다. `base-64` 같은 오타를 조용히 raw로 처리하면 서명 불일치로만 드러난다.

EVM 경로는 이 헤더를 참조하지 않는다. SIWE 메시지는 항상 여러 줄이라 base64가 유일한 표현이다.

## 영향 범위

- `packages/daemon/src/api/middleware/owner-auth.ts`
- `skills/transactions.skill.md` — approve/reject의 owner 헤더 문서화. 기존 문서가 `X-Owner-Signature` 하나만 적고 `X-Owner-Message`·`X-Owner-Address`를 누락하고 있어 함께 정정했다.
- SDK 변경 없음 (`packages/sdk`·`packages/wallet-sdk`는 이 헤더를 쓰지 않는다).

## 리뷰 반영 (2026-08-19, PR #416)

초기 구현의 결함 세 가지를 리뷰에서 잡았다.

- **문서 예시가 이 기능의 핵심 용례에서 깨졌다.** `skills/`에 적은 `| base64` 레시피가 GNU coreutils에서 76컬럼으로 줄바꿈되는데 `$(...)`는 **뒤쪽 개행만** 제거한다. 즉 프롬프트가 57바이트를 넘으면 헤더 값 중간에 개행이 남아 요청이 데몬에 닿기도 전에 거부된다. 이 PR의 테스트 프롬프트(67바이트 → base64 92자)가 이미 그 선을 넘는다. macOS/BSD는 줄바꿈하지 않아 로컬에서는 드러나지 않는다. `| tr -d '\n'`을 붙였다(`base64 -w0`은 GNU 전용이라 기각).
- **빈 디코딩 가드가 거의 아무것도 잡지 못했다.** `Buffer.from(x, 'base64')`는 알파벳 밖 문자를 조용히 버린다 — `hello`는 3바이트, `Approve purchase 5 USDC`는 15바이트, `approve-transaction-1234`는 18바이트로 디코딩된다. 길이 0에 도달하는 것은 base64 문자가 **하나도** 없는 `!!!!` 뿐이다. 나머지는 전부 서명 검증까지 흘러가 "Ed25519 signature verification failed"로 끝나는데, 이는 인코딩 이름에 대해서는 막아 둔 바로 그 읽을 수 없는 실패다. round-trip 검사로 교체했다.
- **그 가드를 검증한다는 테스트가 가드를 지워도 통과했다.** `!!!!`는 가드가 없으면 0바이트 메시지에 대한 서명 불일치로 같은 401을 내기 때문이다. **실제로 가드를 삭제하고 12/12 통과를 확인**해 리뷰 지적이 사실임을 확정했다. 진단 메시지 단정을 추가하고 케이스를 5종으로 늘렸다.

덧붙여 헤더 값을 정규화했다(`trim().toLowerCase()`, 빈 값은 미지정으로 처리, `utf-8` 별칭). 헤더가 있지만 빈 문자열이면 `''`로 도착해 "지원하지 않는 인코딩"으로 거부되던 문제를 없앤다.

## 테스트 항목

`owner-auth.test.ts`에 6건 추가.

1. **base64 한글·다줄 문구 검증 성공** — 수정 없으면 실패
2. **알 수 없는 인코딩 거부** — 수정 없으면 실패
3. 헤더 생략 시 raw 경로 유지 (하위호환)
4. `utf8` 명시 시 raw 경로
5. base64 선언인데 빈 디코딩이면 거부
6. base64 문구에 다른 바이트로 만든 서명이면 거부

3~6은 수정 전후 모두 통과한다(하위호환이 보존됨을 뜻한다).

## 발견 경위

`waiaas/a2a-auction` 데모(A2A 하우스)에서 승인 팝업 문구를 한국어로 만들려다 막혔다. 해당 레포는 현재 한 줄 ASCII로 우회하고 화면이 한국어 설명을 맡는다(`app/user-api.js:437` 주석).
