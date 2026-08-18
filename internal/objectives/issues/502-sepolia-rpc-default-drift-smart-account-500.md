# 502. Sepolia RPC 기본값이 빌트인 풀과 어긋나 스마트 계정 생성이 500으로 실패

- **유형:** BUG
- **심각도:** HIGH
- **발견일:** 2026-08-15
- **상태:** FIXED
- **관련 패키지:** @waiaas/daemon, @waiaas/core

## 현상

`POST /v1/wallets`에 `{ chain: 'ethereum', environment: 'testnet', accountType: 'smart' }`로 요청하면 500(`INTERNAL_ERROR`)이 반환된다. `smart_account.enabled = true`가 정상 설정된 상태에서도 재현된다.

`packages/e2e-tests`의 `advanced-smart-account-userop-owner.e2e.test.ts`에서 3건이 실패했다.

| 테스트 | 기대 | 실제 |
| --- | --- | --- |
| `smart-account-crud > creates a smart account wallet` | 201 | 500 |
| `smart-account-crud > retrieves smart account and confirms accountType` | 200 | 400 |
| `userop-build-sign` (beforeAll) | 201 | 500 |

뒤의 두 건은 지갑 id를 받지 못해 연쇄로 깨진 것이고, 근본 실패는 첫 건 하나다.

## 원인

**코드 변경 없이 외부 요인으로 깨졌다.** `packages/daemon/src/api/routes/wallets.ts`와 `packages/daemon/src/chains`는 2026-04-02 이후 수정된 적이 없고, dev의 마지막 기능 커밋도 2026-07-30(`f388b227`)이다.

스마트 계정 생성은 CREATE2 주소를 예측하기 위해 `eth_call`을 실제 네트워크로 보낸다(`wallets.ts:568-608`). 이때 쓰는 RPC URL이 `sepolia.drpc.org`인데, dRPC가 2026-08 중 **Ethereum Sepolia를 유료 플랜 전용으로 전환**했다.

```
URL: https://sepolia.drpc.org/
Details: {"message":"chain is not available on free plan, please upgrade to paid plan","code":35}
```

실측 결과 dRPC의 다른 9개 엔드포인트(mainnet 5, 그 외 testnet 4)는 모두 정상이다. **Sepolia 하나만 빠졌기 때문에** 이 테스트 파일만 깨졌다.

### 왜 RPC Pool 폴백이 작동하지 않았나

이슈 #210이 `ethereum-sepolia`의 빌트인 후보를 5개로 늘려 폴백을 마련했지만, **기본값이 세 곳에 따로 정의돼 있고 #210은 그중 하나만 고쳤다.**

| 위치 | 용도 | #210 이전 | #210 이후 |
| --- | --- | --- | --- |
| `core/src/rpc/built-in-defaults.ts` | RpcPool 후보 목록 | drpc 외 2개 | `1rpc.io` 등 5개 (수정됨) |
| `daemon/src/infrastructure/config/loader.ts:67` | config.toml zod default | `sepolia.drpc.org` | **그대로** |
| `daemon/src/infrastructure/settings/setting-keys.ts:118` | Admin Settings default | `sepolia.drpc.org` | **그대로** |

스마트 계정 생성 경로는 `AdapterPool`(RpcPool 폴백 내장)을 거치지 않고 `resolveRpcUrl(deps.config.rpc, ...)`로 config 단일 URL을 직접 읽어 viem 클라이언트를 만든다. 그래서 풀에 살아 있는 후보가 3개 있는데도 죽은 엔드포인트 하나만 보고 실패했다.

## 수정

세 곳의 기본값을 빌트인 풀 1순위(`https://1rpc.io/sepolia`)로 일치시키고, 죽은 엔드포인트를 풀에서 제거했다.

- `daemon/src/infrastructure/config/loader.ts` — `evm_ethereum_sepolia` 기본값 교체
- `daemon/src/infrastructure/settings/setting-keys.ts` — `rpc.evm_ethereum_sepolia` 기본값 교체
- `core/src/rpc/built-in-defaults.ts` — `ethereum-sepolia`에서 `sepolia.drpc.org`(유료 전용)와 `rpc.sepolia.org`(404) 제거, 제거 사유를 주석으로 남김

### 엔드포인트 실측 (2026-08-15, `eth_chainId`)

| URL | 결과 |
| --- | --- |
| `https://1rpc.io/sepolia` | ✅ `0xaa36a7` |
| `https://0xrpc.io/sep` | ✅ `0xaa36a7` |
| `https://ethereum-sepolia-rpc.publicnode.com` | ✅ `0xaa36a7` |
| `https://sepolia.drpc.org` | ❌ error code 35 (paid plan only) |
| `https://rpc.sepolia.org` | ❌ HTTP 404 |

## 잔여 사항

근본 구조 문제는 **#503**으로 분리했다. 이번 수정은 죽은 기본값을 살아 있는 값으로 바꾼 것이고, 다음에 `1rpc.io`가 같은 이유로 죽으면 동일한 실패가 재발한다. 폴백이 실제로 작동하게 만드는 것은 #503의 몫이다.

## 테스트 항목

1. **e2e 회귀 검증**: `advanced-smart-account-userop-owner.e2e.test.ts` 9건 통과 (2026-08-15 로컬 확인, 3회 연속)
2. **offchain 스위트 전체**: `pnpm --filter @waiaas/e2e-tests test:offchain` 9 files / 70 tests 통과
3. **기본값 일치 회귀 테스트 (추가함)**: `config-loader.test.ts`에 2건 추가
   - `every RPC default matches the first built-in pool endpoint` — 18개 네트워크 전체에서 `config.rpc[key]`와 `BUILT_IN_RPC_DEFAULTS[network][0]` 일치 확인
   - `every Admin Settings RPC default matches the config default` — `SETTING_DEFINITIONS`의 rpc 기본값과 config 기본값 일치 확인
   - 수정을 되돌리면 두 건 모두 실패하는 것을 확인했다(2026-08-15).
4. **기존 단정 정정**: `default config has all 10 EVM RPC URLs`가 모든 EVM 기본값에 `drpc.org`가 들어 있다고 단정하고 있었다. 특정 벤더에 결합된 단정이라 엔드포인트를 교체할 때마다 깨진다. `^https://` 형식 검사로 바꾸고, 값의 정합성은 위 3번이 담당하게 했다.
