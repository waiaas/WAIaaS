---
id: "advanced-05"
title: "트랜잭션 승인 워크플로우"
category: "advanced"
auth: "session"
network: ["ethereum-sepolia"]
requires_funds: true
estimated_cost_usd: "0"
risk_level: "low"
tags: ["approval", "reject", "cancel", "pending", "owner", "spending-limit"]
---

# 트랜잭션 승인 워크플로우

## Metadata
- **ID**: advanced-05
- **Category**: advanced
- **Network**: ethereum-sepolia
- **Requires Funds**: Yes (testnet ETH)
- **Estimated Cost**: $0 (testnet)
- **Risk Level**: low -- 테스트넷 ETH 전송만 포함

## Prerequisites
- [ ] WAIaaS 데몬 실행 중 (`http://localhost:3100`)
- [ ] 세션 토큰 보유 (sessionAuth)
- [ ] Owner 주소 등록 완료 (state=GRACE 또는 LOCKED). GRACE 상태에서 approve/reject 성공 시 자동으로 LOCKED로 전환
- [ ] Owner 서명 수단 준비 (SIWE 또는 WalletConnect)
- [ ] SPENDING_LIMIT 정책에 APPROVAL 티어 설정 (예: 0.01 ETH 초과 시 APPROVAL)
- [ ] 지갑에 Sepolia ETH 잔액 보유 (faucet에서 수령)

## Scenario Steps

### Step 1: Owner 상태 및 정책 확인
**Action**: connect-info에서 ownerState와 SPENDING_LIMIT 정책의 APPROVAL 티어를 확인한다.
```bash
# Owner 상태 확인 (connect-info의 wallets[].ownerState 필드)
curl -s http://localhost:3100/v1/connect-info \
  -H 'Authorization: Bearer <session-token>'
```
```bash
# 정책 목록 확인
curl -s http://localhost:3100/v1/policies \
  -H 'Authorization: Bearer <session-token>'
```
**Expected**: `wallets[].ownerState`가 `GRACE` 또는 `LOCKED`, SPENDING_LIMIT 정책에 APPROVAL 티어가 설정되어 있다
**Check**: connect-info 응답의 `wallets[].ownerState` 필드 확인. 정책에 `approval` 관련 임계값이 설정되어 있는지 확인

### Step 2: APPROVAL 티어 초과 전송 요청
**Action**: APPROVAL 티어를 초과하는 금액으로 ETH 전송을 요청한다.
```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <session-token>' \
  -d '{
    "walletId": "<WALLET_ID>",
    "type": "TRANSFER",
    "to": "<RECIPIENT_ADDRESS>",
    "amount": "50000000000000000",
    "network": "ethereum-sepolia"
  }'
```
**Expected**: 200 OK, 트랜잭션이 `PENDING` 상태로 생성된다 (이후 QUEUED로 전환)
**Check**: `status` 필드가 `PENDING`인지 확인. `id`를 TX_ID_1로 기록

### Step 3: 대기 중 트랜잭션 목록 조회
**Action**: GET /v1/transactions로 QUEUED 상태의 트랜잭션이 목록에 표시되는지 확인한다.
```bash
curl -s http://localhost:3100/v1/transactions \
  -H 'Authorization: Bearer <session-token>'
```
**Expected**: 200 OK, TX_ID_1이 items 목록에 `QUEUED` 상태로 표시된다 (tier: APPROVAL)
**Check**: TX_ID_1의 `status`가 `QUEUED`이고 `tier`가 `APPROVAL`인지 확인

### Step 4: Owner가 트랜잭션 승인 (approve)
**Action**: Owner가 SIWE/SIWS 서명으로 대기 중인 트랜잭션을 승인한다.
```bash
curl -s -X POST http://localhost:3100/v1/transactions/<TX_ID_1>/approve \
  -H 'X-Owner-Signature: <siwe-signature>' \
  -H 'X-Owner-Message: approve:<TX_ID_1>' \
  -H 'X-Owner-Address: <owner-address>'
```
> 세 헤더가 모두 필요하다. 서명 원문에는 `approve:<TX_ID>` 형태의 토큰이 들어가야 한다. 다른 트랜잭션으로 재사용하는 것과, 거부용 서명을 승인에 돌려쓰는 것을 함께 막는다.
**Expected**: 200 OK, 트랜잭션 상태가 EXECUTING으로 전환된다
**Check**: `status`가 `EXECUTING`, `approvedAt` 타임스탬프가 존재

### Step 5: 승인된 트랜잭션 최종 상태 확인
**Action**: 승인 후 트랜잭션이 CONFIRMED 상태로 완료되었는지 확인한다.
```bash
curl -s http://localhost:3100/v1/transactions/<TX_ID_1> \
  -H 'Authorization: Bearer <session-token>'
```
**Expected**: 200 OK, 트랜잭션 상태가 CONFIRMED이다
**Check**: `status`가 `CONFIRMED`, `txHash`가 존재

### Step 6: 두 번째 APPROVAL 요청 → Owner 거부 (reject)
**Action**: 다시 APPROVAL 티어 초과 전송을 요청한 뒤, Owner가 거부한다.
```bash
# 전송 요청
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <session-token>' \
  -d '{
    "walletId": "<WALLET_ID>",
    "type": "TRANSFER",
    "to": "<RECIPIENT_ADDRESS>",
    "amount": "50000000000000000",
    "network": "ethereum-sepolia"
  }'
```
**Expected**: QUEUED 상태 (tier: APPROVAL). `id`를 TX_ID_2로 기록

```bash
# Owner가 거부
curl -s -X POST http://localhost:3100/v1/transactions/<TX_ID_2>/reject \
  -H 'X-Owner-Signature: <siwe-signature>' \
  -H 'X-Owner-Message: reject:<TX_ID_2>' \
  -H 'X-Owner-Address: <owner-address>'
```
**Expected**: 200 OK, 트랜잭션 상태가 CANCELLED로 전환된다
**Check**: `status`가 `CANCELLED`, `rejectedAt` 타임스탬프가 존재

### Step 7: 거부된 트랜잭션 상태 확인
**Action**: 거부된 트랜잭션의 최종 상태를 확인한다.
```bash
curl -s http://localhost:3100/v1/transactions/<TX_ID_2> \
  -H 'Authorization: Bearer <session-token>'
```
**Expected**: 200 OK, status=CANCELLED
**Check**: 온체인 실행 없이 CANCELLED 상태. `txHash`가 없음

### Step 8: 세 번째 APPROVAL 요청 → 에이전트 취소 (cancel)
**Action**: APPROVAL 대기 중인 트랜잭션을 에이전트(세션)가 직접 취소한다.
```bash
# 전송 요청
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <session-token>' \
  -d '{
    "walletId": "<WALLET_ID>",
    "type": "TRANSFER",
    "to": "<RECIPIENT_ADDRESS>",
    "amount": "50000000000000000",
    "network": "ethereum-sepolia"
  }'
```
**Expected**: QUEUED 상태 (tier: APPROVAL). `id`를 TX_ID_3으로 기록

```bash
# 에이전트(세션)가 취소
curl -s -X POST http://localhost:3100/v1/transactions/<TX_ID_3>/cancel \
  -H 'Authorization: Bearer <session-token>'
```
**Expected**: 200 OK, 트랜잭션 상태가 CANCELLED로 전환된다
**Check**: `status`가 `CANCELLED`

### Step 9: 취소된 트랜잭션 상태 확인
**Action**: 에이전트가 취소한 트랜잭션의 최종 상태를 확인한다.
```bash
curl -s http://localhost:3100/v1/transactions/<TX_ID_3> \
  -H 'Authorization: Bearer <session-token>'
```
**Expected**: 200 OK, status=CANCELLED
**Check**: Owner 서명 없이 세션 토큰만으로 취소 성공. `txHash`가 없음

## Verification
- [ ] APPROVAL 티어 초과 시 TX가 QUEUED 상태(tier: APPROVAL)로 생성
- [ ] QUEUED TX가 GET /v1/transactions 목록에 표시
- [ ] Owner approve 후 TX가 EXECUTING → CONFIRMED로 전환
- [ ] Owner reject 후 TX가 CANCELLED로 전환 (온체인 실행 없음)
- [ ] 에이전트 cancel 후 TX가 CANCELLED로 전환 (Owner 서명 불필요)
- [ ] 승인된 TX만 txHash 존재 (reject/cancel은 txHash 없음)

## Estimated Cost
| Item | Network | Estimated Gas | USD |
|------|---------|---------------|-----|
| ETH transfer (approve 시나리오, Step 4) | ethereum-sepolia | ~21,000 | $0 (testnet) |
| reject/cancel 시나리오 | ethereum-sepolia | 0 | $0 |
| **Total** | | | **$0** |

> **Note**: 테스트넷(Sepolia)에서 실행하므로 실제 비용 없음. reject, cancel 시나리오는 온체인 실행 없이 상태만 전환된다.

## Troubleshooting
| Symptom | Cause | Resolution |
|---------|-------|------------|
| TX가 바로 실행됨 (QUEUED 안 됨) | SPENDING_LIMIT 정책에 APPROVAL 티어 미설정 | Admin UI에서 SPENDING_LIMIT 정책에 APPROVAL 임계값 설정 |
| Owner 미등록 (ownerState=NONE) | Owner 주소가 등록되지 않음 | `POST /v1/owner/register`로 Owner 등록 먼저 수행 |
| approve/reject 시 401 | Owner 서명이 유효하지 않음 | SIWE/SIWS 서명을 올바르게 생성하여 `X-Owner-Signature` 헤더에 전달 |
| cancel 시 400 | TX가 이미 EXECUTING 상태 | QUEUED 상태에서만 cancel 가능. 이미 실행 중이면 취소 불가 |
| CONFIRMED 미전환 | 네트워크 혼잡 또는 가스비 부족 | 잔액 확인 후 재시도. Confirmation Worker 로그 확인 |

## Cleanup
- reject/cancel 시나리오에서 생성한 CANCELLED TX는 DB에 기록으로 남음 (삭제 불필요)
- approve 시나리오에서 테스트넷 ETH가 전송됨 (회수 불필요)
