# 501. 조직 이전 후 남은 `minhoyoo-iotrust` 참조와 GHCR 패키지 접근 불가

- **유형:** BUG
- **심각도:** MEDIUM
- **발견일:** 2026-07-31
- **상태:** 부분 FIXED (실사용 참조 11파일 수정. 배지·glama·옛 계정 패키지는 조치 불필요로 종결, MCP 퍼블리시와 GHCR 공개 여부만 잔여)
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
- `apps/desktop/src-tauri/tauri.conf.json` — **updater 엔드포인트**(`releases/latest/download/latest.json`). **이건 미래 대비가 아니라 이미 깨진 것의 복구다.** 실측: 옛 URL은 `404`, 새 URL은 `200`. GitHub은 레포 이전 시 웹·API는 리다이렉트하지만 **릴리스 자산 다운로드 경로는 리다이렉트하지 않는다.** 따라서 옛 엔드포인트를 담은 빌드는 업데이트 확인이 매번 실패하고, 앱 입장에서 "새 버전 없음"과 구분되지 않아 조용히 낡은 버전에 머문다.

  이전(2026-07-21) **이후** 빌드된 `desktop-v2.16.1-rc.1`(7/22)도 설정을 안 고친 채 나가 옛 URL을 담고 있다(`git show desktop-v2.16.1-rc.1:apps/desktop/src-tauri/tauri.conf.json` 확인).

  이 수정은 **이후 빌드부터** 적용된다. 이미 설치된 앱은 URL이 바이너리에 박혀 있어 자가 치유가 불가능하다(자동 업데이트 자체가 깨진 것이라 자동으로 고칠 수 없다) — 수동 재설치가 필요하다. 유지보수자가 사실상 단독 사용자라 별도 공지 없이 재설치로 처리한다(2026-07-31 확인).

  보안 영향은 없다. updater 설정에 minisign `pubkey`가 함께 박혀 있어 옛 주소에 가짜 `latest.json`이 올라와도 서명 검증에서 걸린다. 가용성 문제이지 무결성 문제가 아니다.
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

실측으로 셋 중 둘은 **조치 불필요**로 판정했다(2026-07-31).

- **테스트 배지 `README.md:8` — 조치 불필요.** gist URL은 현재 `200`으로 정상 동작한다. 갱신 CI는 gist를 하드코딩하지 않고 레포 변수를 쓴다(`nightly.yml:69` `gistID: ${{ vars.TEST_BADGE_GIST_ID }}`, `secrets.GIST_SECRET`). 그리고 **gist는 조직이 소유할 수 없어** "조직으로 이전"이라는 선택지 자체가 없다. 계정을 유지하는 한 현행이 정답이고, 없애려면 배지 방식을 레포 파일 기반 등으로 바꿔야 하는데 이득이 없다.
- **glama `README.md:9`·`glama.json` — 조치 불필요.** 옛 배지 URL이 `301 → https://glama.ai/mcp/servers/waiaas/WAIaaS/badges/score.svg → 200`으로 **glama 쪽이 이미 새 조직을 인식**한다. `glama.json`의 `maintainers: ["minhoyoo-iotrust"]`는 레포 경로가 아니라 **관리자 개인 식별자**라 그대로가 맞다. README URL을 리다이렉트 없는 주소로 정리하는 것은 미관 문제다.
- **MCP 레지스트리 `packages/mcp/{server,package}.json` — 퍼블리시할 때 처리.** 앞선 기록의 "문자열만 바꾸면 기존 등록이 깨진다"는 **틀렸다.** 레지스트리 검색 결과 등록 자체가 없다(`registry.modelcontextprotocol.io/v0/servers?search=waiaas` → `count: 0`). 깨질 등록이 없으므로 지금 바꿔도 위험이 없고, 오히려 옛 이름으로 퍼블리시하면 소유권 검증에 실패한다. 퍼블리시 시점 요구사항: 이름을 `io.github.waiaas/waiaas`로, `package.json`의 `mcpName`을 같은 값으로, **org 네임스페이스는 인증 계정이 조직 Owner여야** 부여된다(CI에서 PAT를 쓸 경우 classic은 `read:org`, fine-grained는 Organization → Members → Read-only 필요). `server.json`의 `version`(현재 `2.11.0`)이 패키지 버전과 어긋나 있는 것도 그때 함께 맞춘다.
- **GHCR 패키지 공개 여부 — 2026-07-31 조사, 2026-08-06 재조사로 진단 정정. 미결.**

  대상은 2개다: `waiaas`(데몬), `waiaas-push-relay`. 둘 다 `waiaas/WAIaaS`에서 발행되며 **익명 pull이 `403 DENIED`**다(2026-08-06 `ghcr.io/v2/{pkg}/tags/list` 실측).

  **막고 있는 것은 패키지 설정이 아니라 조직 정책이다.** 패키지의 Change package visibility 대화상자에서 Public·Internal이 비활성이고 "Setting is disabled by organization administrators"가 표시된다. 따라서 순서는 ① **Organization Settings → Packages → Package creation**(`https://github.com/organizations/waiaas/settings/packages`)에서 Public 허용 → ② 패키지 2개를 각각 Public으로 전환, 이다. 둘 다 조직 Owner 권한이 필요하며 **REST API로는 불가능하다**(패키지 visibility 변경도, 조직 패키지 정책도 엔드포인트가 없다. 웹 UI 전용).

  **2026-08-06 정정 — "아무도 받을 수 없다"는 진단은 부정확했다.** 앞선 기록은 push-relay가 영향받는 근거로 `docs/wallet-sdk-integration.md:75`를 들었으나, 그 줄은 `docker run -d -p 3200:3200 -v /data:/data waiaas/push-relay`로 **Docker Hub 경로**이지 GHCR을 안내하지 않는다. 레포 전체를 훑어도 `ghcr.io`를 **당기는(pull) 곳은 한 군데도 없다**(`release.yml:261`·`:276`·`:316`·`:331`은 push, `:472`는 릴리스 요약 출력). 정확한 상태는 "아무도 못 받는 이미지를 푸시한다"가 아니라 **"아무도 참조하지 않는 중복 경로에 푸시한다"**이다.

  **이 정책이 의도된 것인지는 여전히 확인되지 않았다.** 조직 audit log는 free plan이라 접근 불가(`orgs/waiaas/audit-log` → 404)이고, `GET /orgs/{org}` 응답에 패키지 정책 필드 자체가 없어 API로 조회할 방법이 없다. 정황은 "기본값 미조정" 쪽이다. 의도적 차단이었다면 `release.yml`에서 푸시를 뺐을 것이고, `docker-compose.yml:43` 주석도 "GHCR이 아직 익명 pull이 안 돼서 Docker Hub를 기본으로 둔다"는 취지로 적혀 있다. 확증은 아니다. 의도적이었다면 여는 대신 **`release.yml`에서 GHCR을 제거**하는 편이 일관되며, 그때 손댈 곳은 `:276`·`:331`(images) + `:472`(요약) + `:261`·`:316`(로그인 스텝)이다.

  급하지 않은 이유: **Docker Hub 양쪽 모두 public이고 최신이다**(2026-08-06 실측 — `waiaas/daemon` pull 11,986 / `waiaas/push-relay` pull 6,345, 둘 다 `2.16.1-rc.2`·`latest` 보유, 2026-07-31 갱신). 실사용 참조도 전부 이쪽을 가리킨다. `v` 접두사가 없는 점에 주의.

  옛 계정 패키지 `ghcr.io/minhoyoo-iotrust/waiaas`는 **public 유지로 종결**(2026-08-06 사용자 결정). 여전히 익명 접근 200이고 `latest`도 살아 있지만, 조직이 아니라 **개인 계정 소유라 이 레포의 관리 범위 밖**이고 소유자가 판단할 사안이다. 이 레포에서 그 경로를 참조하는 곳은 이제 없다.

- **`docs/deployment.md` 누락분 — 2026-08-06 수정.** 2026-07-31 정리에서 빠졌던 곳이다. `:132`·`:266`이 `ghcr.io/minho-yoo/waiaas:latest`를 안내했는데, `minho-yoo`는 `minhoyoo-iotrust`와도 다른 **제3의 계정명**이라 치환 패턴에 걸리지 않았다. 이 경로는 익명 접근이 403이라 **배포 가이드를 그대로 따라 하면 막힌다.** 두 곳 모두 `waiaas/daemon:latest`로 교체했다. 전수 확인 결과 `docs/` 안의 나머지 이미지 참조(`seo/mcp-wallet.md:173`, `seo/what-is-ai-wallet.md:189`, `admin-manual/desktop-installation.md:286`, `wallet-sdk-integration.md:75`)는 전부 Docker Hub 경로로 정상이다. 남은 `ghcr.io` 참조는 `internal/design/40-telegram-bot-docker.md:2101`(`ghcr.io/waiaas/daemon:0.2.0`, 존재하지 않는 경로) 하나인데, 작성 시점 스냅샷인 설계 문서라 소급 수정하지 않는다.

## 영향 범위

- `docker-compose.yml`, `apps/desktop/src-tauri/tauri.conf.json`
- `packages/push-relay/Dockerfile`, `packages/sdk/src/client.ts`, `packages/cli/src/commands/init.ts`
- `packages/cli/README.md`, `packages/sdk/README.md`, `docker/README.md`, `examples/simple-agent/README.md`
- `internal/design/74-wallet-sdk-daemon-components.md`
- `docs/deployment.md` (2026-08-06 추가 — 위 "누락분" 항목 참조)

## 테스트 항목

- [x] `docker compose config`로 이미지 참조가 `waiaas/daemon:latest`로 해석되는지
- [x] `WAIAAS_IMAGE` 오버라이드가 동작하는지(로컬 빌드 이미지 지정)
- [x] `waiaas/daemon:latest`가 익명으로 pull 가능한지(manifest 조회)
- [x] `docs/` 전체 이미지 참조 전수 확인 — 남은 경로가 전부 익명 pull 가능한지 (2026-08-06)
- [ ] 새 GHCR 패키지 public 전환 후 `ghcr.io/waiaas/waiaas:latest` 접근 확인 (다음 stable 릴리스 후)
