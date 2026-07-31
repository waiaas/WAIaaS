# 501. 조직 이전 후 남은 `minhoyoo-iotrust` 참조와 GHCR 패키지 접근 불가

- **유형:** BUG
- **심각도:** MEDIUM
- **발견일:** 2026-07-31
- **상태:** 부분 FIXED (실사용 참조 10파일 수정, 외부 등록 3건 + GHCR 공개 여부 미해결)
- **관련 패키지:** 리포지터리 전반 (docker-compose, docs, packages/mcp)

## 현상

레포가 `minhoyoo-iotrust/WAIaaS` → `waiaas/WAIaaS`로 이전됐으나 옛 네임스페이스 참조가 남아 있다. PR #403이 `package.json` URL을 정리했지만 나머지는 훑지 않았다.

가장 영향이 큰 것은 `docker-compose.yml`이었다. `ghcr.io/minhoyoo-iotrust/waiaas:latest`를 하드코딩하고 있어, 이 레포에서 `docker compose up`을 하는 사람은 **이전 개인 계정에 남아 있는 이미지**를 받는다. 그 패키지가 삭제되거나 계정이 정리되면 그대로 깨진다.

## 원인

`release.yml`의 GHCR 대상은 `ghcr.io/${{ github.repository }}`라 이전 후 자동으로 새 조직을 따라간다(`:276`). 반면 문서·compose의 참조는 정적 문자열이라 이전과 함께 갱신되지 않았다.

여기에 두 가지가 겹쳐 새 GHCR 경로가 당장 대안이 되지 못한다.

1. `latest` 태그는 **stable 릴리스에만** 붙는다(`:279`, `enable=${{ !contains(tag_name, '-') }}`). 이전 이후 릴리스는 전부 pre-release(`v2.16.1-rc`, `v2.16.1-rc.1`)라 새 네임스페이스에는 `latest`가 존재하지 않는다. 마지막 stable은 이전 이전의 `v2.16.0`(2026-04-21)이다.
2. `ghcr.io/waiaas/waiaas`는 `v2.16.1-rc.1` 태그조차 익명 접근이 `unauthorized`다. 조직에서 새로 생성된 GHCR 패키지가 기본 private이기 때문으로 보인다(확인 필요 — `read:packages` 스코프 토큰이 있어야 패키지 목록 조회 가능).

한편 `release.yml`은 Docker Hub `waiaas/daemon`에도 함께 푸시한다(`:277`). 이쪽은 조직 소유이고 **익명 pull이 되며 `latest`가 현존**한다.

## 해결 방안

**이번 수정 (실사용 참조 10파일)**

배포되는 산출물과 실행 경로를 우선했다.

- `docker-compose.yml` — 이미지를 `${WAIAAS_IMAGE:-waiaas/daemon:latest}`로. 조직 소유 + 익명 pull 가능한 Docker Hub 경로를 기본값으로 두고, 환경 변수로 GHCR·로컬 빌드 이미지를 덮어쓸 수 있게 했다.
- `apps/desktop/src-tauri/tauri.conf.json` — **updater 엔드포인트**(`releases/latest/download/latest.json`). 릴리스는 이제 새 조직에서 발행되므로 새 경로가 정확하다. 이미 설치된 클라이언트는 옛 URL이 박혀 있지만 GitHub 리다이렉트로 계속 동작하고, 이 변경은 이후 빌드부터 적용된다.
- `packages/push-relay/Dockerfile` — OCI 라벨 `image.url`·`image.source`
- `packages/sdk/src/client.ts` — 오류 메시지의 문서 링크
- `packages/cli/src/commands/init.ts` — 생성되는 config 템플릿 주석
- `packages/cli/README.md`, `packages/sdk/README.md` — npm에 발행되는 README
- `docker/README.md` — GitHub 링크 2곳
- `examples/simple-agent/README.md` — SDK 소개 링크
- `internal/design/74-wallet-sdk-daemon-components.md` — 예시 JSON의 repository URL

**손대지 않은 것 (의도적)**

- `CHANGELOG.md` — 과거 릴리스의 compare·commit 링크는 그 시점의 사실이고, release-please가 관리하는 파일이라 수정해도 되돌려진다. GitHub 리다이렉트로 링크는 살아 있다.
- `internal/objectives/archive/**`, `.planning/**` — 과거 이슈·마일스톤·계획 기록. 당시 URL이 맞다.
- `scripts/devto-replace-links.mjs` — 옛 경로를 **입력값(`SEARCH`)** 으로 갖는 것이 정상 동작이다. 바꾸면 치환이 동작하지 않는다.

**남은 작업 (외부 시스템 소유권 확인 필요, 이 이슈로 추적)**

- `packages/mcp/server.json`·`packages/mcp/package.json` — `io.github.minhoyoo-iotrust/waiaas`. MCP 레지스트리의 네임스페이스 식별자(`name`/`mcpName`)라 소유권 검증·재등록 절차와 묶여 있다. 문자열만 바꾸면 등록이 깨질 수 있어 이번 수정에서 제외했다. 같은 파일의 `websiteUrl`·repository URL도 재등록 시 함께 바꾸는 편이 안전하다.
- `README.md:8` — 테스트 배지가 옛 계정 gist를 가리킨다. 옮기려면 gist 이전이 선행되어야 한다.
- `README.md:9`, `glama.json` — glama.ai 등록 메타. 서비스 쪽 등록 경로와 함께 갱신해야 한다.
- **GHCR 패키지 `ghcr.io/waiaas/waiaas` 공개 여부** — private이면 public으로 전환해야 GHCR 경로가 실사용 가능해진다. 다음 stable 릴리스 전에 정리하면 `latest`까지 새 네임스페이스로 정착한다.

## 영향 범위

- `docker-compose.yml`, `apps/desktop/src-tauri/tauri.conf.json`
- `packages/push-relay/Dockerfile`, `packages/sdk/src/client.ts`, `packages/cli/src/commands/init.ts`
- `packages/cli/README.md`, `packages/sdk/README.md`, `docker/README.md`, `examples/simple-agent/README.md`
- `internal/design/74-wallet-sdk-daemon-components.md`

## 테스트 항목

- [x] `docker compose config`로 이미지 참조가 `waiaas/daemon:latest`로 해석되는지
- [x] `WAIAAS_IMAGE` 오버라이드가 동작하는지(로컬 빌드 이미지 지정)
- [x] `waiaas/daemon:latest`가 익명으로 pull 가능한지(manifest 조회)
- [ ] 새 GHCR 패키지 public 전환 후 `ghcr.io/waiaas/waiaas:latest` 접근 확인 (다음 stable 릴리스 후)
