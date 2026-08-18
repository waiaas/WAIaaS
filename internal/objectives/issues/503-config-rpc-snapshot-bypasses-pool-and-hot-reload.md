# 503. `config.rpc` 직접 참조 경로가 RpcPool 폴백과 Admin Settings 핫리로드를 모두 우회한다

- **유형:** BUG
- **심각도:** HIGH
- **발견일:** 2026-08-15
- **상태:** 부분 FIXED (스마트 계정 생성 경로만 폴백 적용. 나머지 22개 호출 지점과 핫리로드 문제는 잔여)
- **관련 패키지:** @waiaas/daemon
- **관련 이슈:** #502 (이 구조 때문에 회귀가 발생), #210 (풀 후보 확장)

## 현상

두 가지가 함께 깨져 있다.

1. **RPC Pool 폴백이 적용되지 않는다.** RpcPool에 살아 있는 엔드포인트가 여러 개 있어도, 특정 경로는 config의 단일 URL만 보고 그것이 죽어 있으면 즉시 500을 반환한다.
2. **Admin Settings로 RPC를 바꿔도 반영되지 않는다.** `PUT /v1/admin/settings`로 `rpc.evm_ethereum_sepolia`를 교체하면 200이 돌아오지만, 같은 데몬에서 이어지는 요청은 여전히 **부팅 시점 URL**을 사용한다.

### 실측 (2026-08-15)

`sepolia.drpc.org`가 유료 전용이 된 상태에서:

```
PUT /v1/admin/settings  {"key":"rpc.evm_ethereum_sepolia","value":"https://1rpc.io/sepolia"}
→ 200
   로그: "Hot-reload: Reset RpcPool cooldown for ethereum-sepolia"

POST /v1/wallets  {accountType:"smart", chain:"ethereum", environment:"testnet"}
→ 500  URL: https://sepolia.drpc.org/   ← 바꾸기 전 값을 계속 사용
```

CLAUDE.md의 "Prefer Admin Settings over config.toml" 원칙이 이 경로들에서 성립하지 않는다.

## 원인

RPC URL을 얻는 함수가 두 갈래인데 대부분이 폴백 없는 쪽을 쓴다.

| 함수 | 동작 | 호출 지점 |
| --- | --- | --- |
| `resolveRpcUrl(rpcConfig, chain, network)` | config 객체에서 키 조회만. 폴백 없음 | **23곳** |
| `resolveRpcUrlFromPool(rpcPool, settingsGet, chain, network)` | RpcPool 우선 → SettingsService 폴백 | 4곳 |

`AdapterPool.resolve()`는 내부적으로 RpcPool을 쓰므로 **어댑터를 거치는 경로는 폴백이 있다.** 문제는 어댑터를 거치지 않고 viem/Solana 클라이언트를 직접 만드는 경로다. 스마트 계정 생성(`wallets.ts:568-608`)과 UserOp 빌드(`userop.ts:162, 441`)가 그렇다.

핫리로드가 반영되지 않는 이유는 `hot-reload.ts`의 `reloadRpc()`가 **AdapterPool 어댑터 evict + RpcPool cooldown reset만 수행**하고 `deps.config.rpc` 객체 자체는 갱신하지 않기 때문이다. 따라서 그 객체를 직접 읽는 23곳은 부팅 시점 값에 고정된다.

`resolveRpcUrl`을 쓰는 파일:

```
lifecycle/daemon-startup.ts      lifecycle/daemon-pipeline.ts
api/routes/wallet.ts             api/routes/wallets.ts
api/routes/userop.ts             api/routes/tokens.ts
api/routes/x402.ts               api/routes/actions.ts
api/routes/admin-actions.ts      api/routes/admin-wallets.ts
api/routes/rpc-proxy.ts          api/routes/transactions.ts
services/monitoring/balance-monitor-service.ts
services/defi/position-tracker.ts
```

## 영향

- 공개 무료 RPC가 하나 죽을 때마다 해당 기능이 전면 중단된다. 실제로 #502가 이 경로로 발생했다.
- 사용자가 Admin UI에서 RPC를 교체해도 데몬을 재시작하기 전까지 적용되지 않는다. 화면은 성공했다고 표시하므로 조용히 어긋난다.
- 기본값이 세 곳(`built-in-defaults.ts`, `loader.ts`, `setting-keys.ts`)에 중복 정의돼 있어 한 곳만 고치면 나머지가 남는다. #210이 정확히 그렇게 어긋났다.

## CI 실측 — 기본값 교체만으로는 부족했다 (2026-08-18)

#502에서 기본값을 `1rpc.io/sepolia`로 바꾼 뒤, PR #414와 #413의 CI는 통과했다. 그러나 **19분 뒤 PR #412의 CI에서 같은 3건이 다시 실패했다.**

merge ref(`3c784074`)에 수정 세 곳이 전부 들어 있는 것을 git으로 확인했으므로, 실패 원인은 **`1rpc.io`도 CI 환경에서 실패했다**는 것이다. 같은 시각 로컬에서는 세 엔드포인트 모두 200이고 1rpc.io 8연타도 전부 200이라, GitHub Actions IP에 대한 차단이나 제한으로 추정된다(**미확인** — e2e가 500 응답 본문을 로그에 남기지 않아 서버측 원인을 CI에서 볼 수 없다).

**결론**: 기본값 교체는 재발 확률만 낮췄고, 단일 엔드포인트 의존이라는 구조는 그대로였다. #414·#413의 green도 운이었을 수 있다. 이 실측이 이 이슈가 선택이 아니라 필수임을 확정했다.

## 부분 수정 (2026-08-18)

스마트 계정 생성 경로(`wallets.ts`)만 RpcPool 기반 폴백으로 바꿨다.

- 후보 수만큼 순회하며 `rpcPool.getUrl(network)` → 실패 시 `reportFailure` → 다음 후보. 성공 시 `reportSuccess`.
- 모든 후보가 cooldown이면 마지막 실제 에러를 그대로 올린다.
- RpcPool이 없으면 기존 `resolveRpcUrl(config.rpc, ...)` 1회 시도로 동작이 보존된다(하위호환).

**배선 변경이 필요 없었다.** `adapterPool`은 이미 `server.ts:565`에서 wallets 라우트에 주입되고 있고, `AdapterPool.pool` getter로 RpcPool에 닿는다. #502에서 "`daemon-startup.ts`를 건드려야 해 범위가 크다"고 판단한 것은 틀렸다.

### 실측 검증

config URL과 풀 1·2순위를 전부 죽은 URL로 두고 대조했다.

| 코드 | 결과 |
| --- | --- |
| 수정 전 | 500 (`dead-config.invalid`를 치고 풀을 완전히 무시) |
| 수정 후 | **201** (풀 순회로 3순위 `1rpc.io/sepolia` 성공) |

수정 후 풀 상태에서 죽은 두 URL은 `cooldown`/`failureCount=1`, 성공한 URL은 `available`/`failureCount=0`이었다.

### 함께 드러난 것 — 성공 경로에 유닛 테스트가 없었다

`smart-account-wallet-creation.test.ts`에 **스마트 계정 생성 성공(201) 케이스가 하나도 없었다.** 기존 smart 관련 테스트는 전부 거부 경로(feature gate, Solana 거부, provider 검증)였다. 그래서 이 회귀를 e2e에서만 잡을 수 있었다.

원인은 mock keystore가 `new Uint8Array(32)`(0으로 채운 키)를 돌려주는 것이었다. 0은 유효한 secp256k1 스칼라가 아니라 `privateKeyToAccount`가 `createSmartAccount`에 닿기도 전에 던진다. anvil 테스트 키로 교체해 성공 경로를 처음으로 커버했다.

## 남은 수정 방안 (제안)

1. **`resolveRpcUrl` 호출부를 `resolveRpcUrlFromPool`로 이관.** 라우트 deps에 `rpcPool`을 배선한다. 23곳을 한 번에 옮기는 것은 위험하므로, 어댑터를 거치지 않는 경로(`wallets.ts` 스마트 계정 생성, `userop.ts`)부터 우선 처리한다.
2. **기본값의 단일 출처화.** `loader.ts`·`setting-keys.ts`의 EVM/Solana RPC 기본값을 `BUILT_IN_RPC_DEFAULTS[network][0]`에서 파생시켜 중복 정의를 없앤다.
3. **핫리로드 시 `config.rpc` 갱신.** `reloadRpc()`가 `deps.config.rpc`의 해당 키도 갱신하도록 한다. 1번이 완료되면 불필요해질 수 있으므로 순서를 고려한다.

## 테스트 항목

1. ~~**폴백 검증**~~ **(완료)**: `smart-account-wallet-creation.test.ts`에 4건 추가
   - `falls back to the next pool endpoint when the first one fails` — 1순위 실패 → 2순위 성공, cooldown 적용 확인
   - `tries every candidate before giving up` — 후보 수만큼 시도한 뒤 에러를 올리는지 확인
   - `does not leave a wallet row behind when every endpoint fails` — 실패 시 지갑 행이 남지 않는지 확인
   - `uses the config URL exactly once when no RpcPool is wired` — 하위호환 보존 확인
   - 수정을 되돌리면 앞 3건이 실패하는 것을 확인했다.
2. **핫리로드 검증 (잔여)**: `PUT /v1/admin/settings`로 RPC 교체 후 재시작 없이 새 URL이 사용되는지 확인 (현재 실패하는 케이스)
3. ~~**기본값 일치 검증**~~ **(완료, #502)**: `config-loader.test.ts`에서 18개 네트워크 전체 대조
4. **회귀 방지 (잔여)**: `resolveRpcUrl`이 새 호출 지점에서 쓰이지 않도록 하는 lint 규칙 또는 테스트
