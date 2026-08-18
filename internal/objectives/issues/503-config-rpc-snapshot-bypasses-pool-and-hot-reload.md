# 503. `config.rpc` 직접 참조 경로가 RpcPool 폴백과 Admin Settings 핫리로드를 모두 우회한다

- **유형:** BUG
- **심각도:** HIGH
- **발견일:** 2026-08-15
- **상태:** OPEN
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

## 수정 방안 (제안)

1. **`resolveRpcUrl` 호출부를 `resolveRpcUrlFromPool`로 이관.** 라우트 deps에 `rpcPool`을 배선한다. 23곳을 한 번에 옮기는 것은 위험하므로, 어댑터를 거치지 않는 경로(`wallets.ts` 스마트 계정 생성, `userop.ts`)부터 우선 처리한다.
2. **기본값의 단일 출처화.** `loader.ts`·`setting-keys.ts`의 EVM/Solana RPC 기본값을 `BUILT_IN_RPC_DEFAULTS[network][0]`에서 파생시켜 중복 정의를 없앤다.
3. **핫리로드 시 `config.rpc` 갱신.** `reloadRpc()`가 `deps.config.rpc`의 해당 키도 갱신하도록 한다. 1번이 완료되면 불필요해질 수 있으므로 순서를 고려한다.

## 테스트 항목

1. **폴백 검증**: RpcPool 1순위를 죽은 URL로 만들고 스마트 계정 생성이 2순위로 성공하는지 확인
2. **핫리로드 검증**: `PUT /v1/admin/settings`로 RPC 교체 후 재시작 없이 새 URL이 사용되는지 확인 (현재 실패하는 케이스)
3. **기본값 일치 검증**: `BUILT_IN_RPC_DEFAULTS[network][0]`과 `loader.ts`·`setting-keys.ts` 기본값이 모든 네트워크에서 일치하는지 확인
4. **회귀 방지**: `resolveRpcUrl`이 새 호출 지점에서 쓰이지 않도록 하는 lint 규칙 또는 테스트
