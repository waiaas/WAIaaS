# 500. x402 fetch 라우트가 Solana 서명에 rpc를 전달하지 않아 결제 100% 실패

- **유형:** BUG
- **심각도:** CRITICAL
- **발견일:** 2026-07-30
- **상태:** FIXED
- **관련 패키지:** @waiaas/daemon

## 현상

`POST /v1/x402/fetch`로 Solana 네트워크(CAIP-2 `solana:*`)의 402 결제를 처리하면 서명 단계에서 항상 실패한다. 정책 평가(INSTANT)까지 정상 통과한 뒤 Phase C에서 예외가 발생해 트랜잭션이 `FAILED`로 기록되고 클라이언트는 `X402_SERVER_ERROR`를 받는다. EVM 결제는 영향 없다.

## 원인

라우트가 `signPayment`를 5개 인자로만 호출해 6번째 인자 `rpc`가 `undefined`로 남는다 (`packages/daemon/src/api/routes/x402.ts` Phase C1).

Solana 경로(`signSolanaTransferChecked`)는 트랜잭션 lifetime을 만들기 위해 이 rpc로 blockhash를 조회한다:

```ts
const solanaRpc = rpc as { getLatestBlockhash: () => { send: () => Promise<...> } };
const { value: blockhashInfo } = await solanaRpc.getLatestBlockhash().send();
```

`rpc`가 `undefined`이므로 `Cannot read properties of undefined (reading 'getLatestBlockhash')` TypeError가 난다. x402 Solana 스킴은 facilitator가 feePayer로 공동 서명하는 구조여서 트랜잭션 조립을 지불자(데몬)가 담당하고, 따라서 데몬이 자기 RPC를 가져야 한다. EVM 경로는 EIP-712 오프라인 서명이라 rpc가 필요 없어서 같은 결함이 드러나지 않았다.

기존 유닛 테스트가 이 결함을 잡지 못한 이유: `payment-signer` 유닛 테스트는 mock rpc를 `signPayment`에 **직접 주입**해서 검증하고, 라우트 통합 테스트는 `payment-signer` 모듈 자체를 mock하므로 "라우트가 rpc를 넘기는가"를 아무도 관측하지 않았다.

## 해결 방안

Phase C1에서 결제 대상 체인이 Solana일 때 RPC 클라이언트를 만들어 `signPayment` 6번째 인자로 전달한다. RPC URL은 다른 라우트와 동일한 규약(`resolveRpcUrl(config.rpc, chain, network)`)으로 해석해 CAIP-2에서 유도한 network에 맞는 엔드포인트를 쓴다. EVM은 `undefined`를 그대로 유지한다.

```ts
const signingRpc = resolvedChain === 'solana'
  ? createSolanaRpc(resolveRpcUrl(deps.config.rpc, resolvedChain, resolvedNetwork))
  : undefined;
```

## 영향 범위

- `packages/daemon/src/api/routes/x402.ts` — Phase C1에 rpc 생성·전달 (+`@solana/kit`의 `createSolanaRpc`, `resolveRpcUrl` import)
- `packages/daemon/src/__tests__/x402-route.test.ts` — 회귀 테스트 2건 추가

## 테스트 항목

- [x] Solana CAIP-2 402 결제 시 라우트가 `signPayment`에 `getLatestBlockhash`를 가진 rpc 객체를 6번째 인자로 전달하는지
- [x] EVM CAIP-2 402 결제 시 6번째 인자가 `undefined`로 유지되는지 (오프라인 서명 회귀 방지)
- [x] 기존 x402 라우트 테스트 전부 통과 (23건)
