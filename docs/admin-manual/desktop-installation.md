---
title: "Desktop App Installation Guide"
description: "WAIaaS Desktop App 설치 가이드 - macOS, Windows, Linux"
keywords: ["desktop", "installation", "tauri", "setup", "download", "gatekeeper", "smartscreen"]
date: "2026-04-01"
section: "docs"
category: "Admin Manual"
---

# Desktop App Installation Guide

> 이 문서는 Operator(관리자)를 위한 문서입니다. AI 에이전트 접근은 sessionAuth로 제한됩니다.

WAIaaS Desktop App은 **Tauri 2** 기반의 네이티브 데스크톱 애플리케이션입니다. Node.js SEA(Single Executable Application) 바이너리를 내장하여 별도의 Node.js 설치 없이 데몬을 실행하며, Admin Web UI가 통합되어 브라우저 없이도 지갑을 관리할 수 있습니다.

## 주요 특징

- **원클릭 설치**: 별도 런타임 설치 없이 바로 실행
- **내장 데몬**: Node.js SEA 바이너리로 패키징된 WAIaaS 데몬
- **Admin UI 통합**: 브라우저 없이 네이티브 창에서 Admin UI 접근
- **시스템 트레이**: 3색 상태 아이콘(초록/노랑/빨강)으로 데몬 상태 표시
- **자동 업데이트**: Ed25519 서명 검증 기반 안전한 자동 업데이트
- **WalletConnect QR**: 네이티브 QR 코드로 Owner 지갑 연동

---

## 다운로드

GitHub Releases 페이지에서 `desktop-v*` 태그가 붙은 최신 릴리스를 다운로드합니다.

**릴리스 페이지**: [https://github.com/waiaas/WAIaaS/releases](https://github.com/waiaas/WAIaaS/releases)

`desktop-v` 접두사가 붙은 릴리스를 찾아 자신의 OS에 맞는 아티팩트를 다운로드하세요.

### OS별 아티팩트

| OS | 아키텍처 | 파일 형식 | 파일명 패턴 |
|------|----------|-----------|-------------|
| macOS | Apple Silicon (M1/M2/M3/M4) | `.dmg` | `WAIaaS-Desktop_*_aarch64.dmg` |
| macOS | Intel | `.dmg` | `WAIaaS-Desktop_*_x64.dmg` |
| Windows | x86_64 | `.msi` | `WAIaaS-Desktop_*_x64_en-US.msi` |
| Linux | x86_64 | `.AppImage` | `WAIaaS-Desktop_*_amd64.AppImage` |
| Linux | x86_64 | `.deb` | `WAIaaS-Desktop_*_amd64.deb` |

> **Tip**: macOS에서 자신의 아키텍처를 확인하려면 터미널에서 `uname -m`을 실행하세요. `arm64`면 Apple Silicon, `x86_64`면 Intel입니다.

---

## macOS 설치

### 1. DMG 설치

1. 위 다운로드 섹션에서 자신의 Mac 아키텍처에 맞는 `.dmg` 파일을 다운로드합니다.
2. 다운로드된 `.dmg` 파일을 더블클릭하여 마운트합니다.
3. 마운트된 디스크 이미지에서 **WAIaaS Desktop** 아이콘을 **Applications** 폴더로 드래그합니다.
4. Finder에서 Applications 폴더를 열고 **WAIaaS Desktop**을 더블클릭하여 실행합니다.

### 2. Gatekeeper 경고 해제

WAIaaS Desktop은 현재 Apple Developer ID 코드 사이닝 인증서가 없기 때문에, macOS Gatekeeper가 실행을 차단합니다. OS 버전에 따라 해제 방법이 다릅니다.

#### macOS 14 Sonoma 이하

처음 실행 시 **"WAIaaS Desktop은(는) Apple에서 확인할 수 없는 개발자가 만든 것이므로 열 수 없습니다"** 대화상자가 나타납니다.

**방법 A: 시스템 환경설정에서 허용**

1. **시스템 환경설정** (System Preferences) → **보안 및 개인정보 보호** (Security & Privacy) → **일반** (General) 탭을 엽니다.
2. 하단에 **"WAIaaS Desktop의 사용이 차단되었습니다"** 메시지가 표시됩니다.
3. **"확인 없이 열기"** (Open Anyway) 버튼을 클릭합니다.
4. 확인 대화상자에서 **"열기"** (Open)를 클릭합니다.

**방법 B: 터미널 명령**

```bash
xattr -cr /Applications/WAIaaS\ Desktop.app
```

이 명령은 앱에서 격리 속성(quarantine attribute)을 제거하여 Gatekeeper 검사를 건너뜁니다.

#### macOS 15 Sequoia 이상

macOS 15 Sequoia에서는 Gatekeeper 동작이 변경되었습니다. 처음 실행 시 **"WAIaaS Desktop을(를) 열 수 없습니다"** 대화상자가 표시되며, 이전 버전과 달리 "확인 없이 열기" 옵션이 대화상자에 직접 표시되지 않습니다.

**해제 방법:**

1. 앱을 실행 시도합니다 (대화상자가 나타나면 닫습니다).
2. **System Settings** → **Privacy & Security** 를 엽니다.
3. 페이지를 아래로 스크롤하여 **"WAIaaS Desktop" was blocked from use because it is not from an identified developer** 항목을 찾습니다.
4. **"Open Anyway"** 버튼을 클릭합니다.
5. 관리자 비밀번호를 입력하거나 Touch ID로 인증합니다.
6. 확인 대화상자에서 **"Open"** 을 클릭합니다.

> **Note**: Sequoia에서도 터미널에서 `xattr -cr /Applications/WAIaaS\ Desktop.app` 명령을 사용할 수 있습니다. 이 명령은 모든 macOS 버전에서 동일하게 동작합니다.

---

## Windows 설치

### 1. MSI 설치

1. 위 다운로드 섹션에서 `.msi` 파일을 다운로드합니다.
2. 다운로드된 `.msi` 파일을 더블클릭하여 설치 마법사를 시작합니다.
3. 설치 마법사의 안내에 따라 설치를 완료합니다.

**설치 위치**: `C:\Program Files\WAIaaS Desktop\`

### 2. SmartScreen 경고 허용

WAIaaS Desktop은 현재 Windows 코드 사이닝 인증서가 없기 때문에, 설치 시 Microsoft SmartScreen이 경고를 표시합니다.

**"Windows에서 PC를 보호함" (Windows protected your PC)** 대화상자가 나타나면:

1. **"추가 정보"** (More info) 링크를 클릭합니다.
2. 앱 이름과 게시자 정보가 표시됩니다.
3. **"실행"** (Run anyway) 버튼을 클릭합니다.

> **Note**: 이 경고는 최초 설치 시에만 나타납니다. 한 번 허용하면 이후 실행 시에는 표시되지 않습니다.

### 3. 실행

- **시작 메뉴**에서 "WAIaaS Desktop"을 검색하여 실행합니다.
- 또는 바탕화면 바로가기(설치 시 생성된 경우)를 더블클릭합니다.

---

## Linux 설치

Linux에서는 **AppImage** 또는 **deb** 패키지로 설치할 수 있습니다.

### AppImage 설치

AppImage는 별도의 설치 과정 없이 단일 실행 파일로 동작합니다.

1. `.AppImage` 파일을 다운로드합니다.
2. 실행 권한을 부여합니다:

```bash
chmod +x WAIaaS-Desktop_*_amd64.AppImage
```

3. 실행합니다:

```bash
./WAIaaS-Desktop_*_amd64.AppImage
```

#### FUSE 의존성

Ubuntu 22.04 이상에서는 FUSE 2 라이브러리가 기본 설치되어 있지 않을 수 있습니다. AppImage 실행 시 FUSE 관련 오류가 발생하면:

```bash
sudo apt install libfuse2
```

### deb 패키지 설치

Debian/Ubuntu 계열 배포판에서는 `.deb` 패키지로 설치할 수 있습니다.

1. `.deb` 파일을 다운로드합니다.
2. 패키지를 설치합니다:

```bash
sudo dpkg -i waiaas-desktop_*_amd64.deb
```

3. 누락된 의존성이 있으면 해결합니다:

```bash
sudo apt install -f
```

설치 완료 후 데스크톱 환경의 애플리케이션 메뉴에 **WAIaaS Desktop**이 자동 등록됩니다. 또는 터미널에서 `waiaas-desktop` 명령으로 실행할 수 있습니다.

---

## Setup Wizard

Desktop App을 처음 실행하면 **Setup Wizard**가 자동으로 시작됩니다. 5단계를 통해 데몬 초기 설정을 완료합니다.

> Setup Wizard는 최초 실행 시에만 표시됩니다. 설정 완료 후에는 바로 대시보드가 열립니다.

### 1단계: 마스터 비밀번호 설정

데몬 관리에 사용할 마스터 비밀번호를 생성합니다.

- 비밀번호는 **Argon2id** 알고리즘으로 해시되어 저장됩니다.
- 이 비밀번호는 Admin UI 접근 및 모든 관리 API 호출에 필요합니다.
- 분실 시 복구가 불가능하므로 안전한 곳에 기록해 두세요.

### 2단계: 네트워크 선택

사용할 블록체인 네트워크를 선택하고 RPC URL을 설정합니다.

- **EVM 네트워크**: Ethereum, Polygon, Arbitrum, Base, Optimism 등
- **Solana 네트워크**: Solana Mainnet, Devnet
- 각 네트워크의 RPC URL을 직접 입력하거나 기본값을 사용합니다.
- 테스트넷 네트워크도 선택 가능합니다.

### 3단계: 지갑 생성

첫 번째 지갑을 생성합니다.

- HD(Hierarchical Deterministic) 키가 자동으로 생성됩니다.
- 지갑 이름을 지정할 수 있습니다.
- 생성된 지갑은 선택한 네트워크에서 바로 사용 가능합니다.

### 4단계: Owner 설정 (선택)

지갑의 Owner를 등록합니다. 이 단계는 **건너뛸 수 있습니다**.

- **WalletConnect**: QR 코드를 스캔하여 외부 지갑(MetaMask, Phantom 등)을 Owner로 등록합니다.
- Owner를 등록하면 고액 거래 시 승인을 요청받습니다.
- 나중에 Admin UI에서 Owner를 추가할 수 있으므로 건너뛰어도 됩니다.

### 5단계: 완료

설정이 완료되면 **대시보드**로 이동합니다.

- Admin UI가 브라우저 없이 네이티브 창에서 열립니다.
- 시스템 트레이에 WAIaaS 아이콘이 표시됩니다.

#### 시스템 트레이 아이콘

데몬 상태를 3색 아이콘으로 표시합니다:

| 아이콘 색상 | 상태 | 설명 |
|-------------|------|------|
| 초록 | Running | 데몬이 정상 실행 중 |
| 노랑 | Starting | 데몬이 시작 중 |
| 빨강 | Error | 데몬 시작 실패 또는 오류 발생 |

트레이 아이콘을 클릭하면 메뉴가 나타나며, **Show Window**, **Restart Daemon**, **Quit** 등의 옵션을 사용할 수 있습니다.

---

## 자동 업데이트

WAIaaS Desktop은 **Ed25519 서명 검증** 기반의 안전한 자동 업데이트를 지원합니다.

### 동작 방식

1. 앱 시작 시 Tauri updater가 GitHub Releases의 `latest.json` 엔드포인트를 확인합니다.
2. 새 버전이 감지되면 업데이트 알림이 표시됩니다.
3. 사용자가 업데이트를 수락하면:
   - 새 바이너리를 자동으로 다운로드합니다.
   - **Ed25519 서명을 검증**하여 바이너리의 무결성과 진위를 확인합니다.
   - 서명이 유효하면 자동으로 설치하고 앱을 재시작합니다.
4. 서명 검증에 실패하면 업데이트가 거부되고 오류 메시지가 표시됩니다.

**업데이트 엔드포인트**:

```
https://github.com/waiaas/WAIaaS/releases/latest/download/latest.json
```

### Ed25519 서명 검증

- 릴리스 바이너리는 빌드 CI에서 Ed25519 키로 서명됩니다.
- Tauri updater가 앱에 내장된 공개키로 서명을 검증합니다.
- 중간자 공격(MITM)이나 변조된 바이너리로부터 보호합니다.
- Apple/Microsoft 코드 사이닝과 독립적인 자체 검증 체계입니다.

### 수동 업그레이드

자동 업데이트가 동작하지 않거나 특정 버전을 설치하려면:

1. [GitHub Releases](https://github.com/waiaas/WAIaaS/releases) 페이지에서 원하는 버전의 아티팩트를 다운로드합니다.
2. 기존 앱을 덮어쓰기 설치합니다:
   - **macOS**: 새 `.dmg`에서 Applications 폴더로 드래그 (기존 앱 덮어쓰기)
   - **Windows**: 새 `.msi` 실행 (기존 설치 위에 덮어쓰기)
   - **Linux AppImage**: 기존 `.AppImage` 파일을 새 파일로 교체
   - **Linux deb**: `sudo dpkg -i <new-version>.deb`

> **Note**: 수동 업그레이드 시 데이터(지갑, 정책, 설정)는 유지됩니다. 데몬 데이터는 앱 바이너리와 별도 위치에 저장됩니다.

---

## 대체 설치 방법

Desktop App 외에도 CLI 또는 Docker로 WAIaaS를 설치할 수 있습니다.

| 방법 | 명령 | 용도 |
|------|------|------|
| npm (CLI) | `npm install -g @waiaas/cli` | 서버/헤드리스 환경 |
| Docker | `docker pull waiaas/daemon` | 컨테이너 환경 |
| Desktop App | 이 문서 참조 | 데스크톱 GUI 환경 |

CLI 설치에 대한 자세한 내용은 [Setup Guide](./setup-guide.md)를 참조하세요.

---

## 트러블슈팅

### macOS

**"손상된 파일이므로 휴지통으로 이동해야 합니다" 오류**

Gatekeeper가 앱을 차단한 경우입니다. 터미널에서 격리 속성을 제거합니다:

```bash
xattr -cr /Applications/WAIaaS\ Desktop.app
```

**앱이 실행되지만 화면이 빈 경우**

데몬 시작에 시간이 걸릴 수 있습니다. 시스템 트레이 아이콘이 초록색으로 바뀔 때까지 기다리세요. 계속 문제가 발생하면 앱을 종료 후 재시작합니다.

### Windows

**MSI 설치 실패**

관리자 권한으로 설치를 시도합니다:

1. `.msi` 파일을 마우스 오른쪽 버튼으로 클릭합니다.
2. **"관리자 권한으로 실행"** (Run as administrator)을 선택합니다.

**SmartScreen이 설치를 완전히 차단하는 경우**

기업 환경에서 SmartScreen 정책이 강화되어 있을 수 있습니다. IT 관리자에게 앱 허용을 요청하세요.

### Linux

**AppImage "Permission denied" 오류**

실행 권한이 설정되어 있는지 확인합니다:

```bash
chmod +x WAIaaS-Desktop_*_amd64.AppImage
```

**AppImage 실행 시 FUSE 오류**

FUSE 2 라이브러리를 설치합니다:

```bash
sudo apt install libfuse2          # Ubuntu/Debian
sudo dnf install fuse-libs         # Fedora
sudo pacman -S fuse2               # Arch Linux
```

### 공통

**데몬 시작 실패 (포트 충돌)**

WAIaaS 데몬은 기본적으로 포트 3100을 사용합니다. 이미 다른 프로세스가 해당 포트를 사용 중이면 데몬이 시작되지 않습니다.

포트 사용 여부를 확인합니다:

```bash
# macOS / Linux
lsof -i :3100

# Windows (PowerShell)
netstat -ano | findstr 3100
```

충돌하는 프로세스를 종료하거나, Desktop App이 자동으로 다른 사용 가능한 포트를 찾아 바인딩합니다 (TCP bind(0) 메커니즘).

**로그 확인**

데몬 로그를 확인하여 오류 원인을 파악합니다:

- **macOS**: `~/Library/Logs/dev.waiaas.desktop/` 또는 콘솔 앱에서 확인
- **Windows**: `%APPDATA%\dev.waiaas.desktop\logs\`
- **Linux**: `~/.local/share/dev.waiaas.desktop/logs/` 또는 `journalctl --user -u waiaas-desktop`

---

## 시스템 요구 사항

| OS | 최소 버전 | 아키텍처 |
|------|-----------|----------|
| macOS | 10.15 Catalina | Apple Silicon (aarch64), Intel (x86_64) |
| Windows | 10 (1809+) | x86_64 |
| Linux | Ubuntu 20.04 / Debian 11 / Fedora 35 | x86_64 |

**공통 요구 사항**:
- 디스크 공간: 200MB 이상
- 메모리: 512MB 이상
- 네트워크: 블록체인 RPC 접근을 위한 인터넷 연결

---

## 다음 단계

설치와 초기 설정이 완료되면:

1. **지갑 관리**: Admin UI에서 추가 지갑 생성, 세션 발급 → [Wallet Management](./wallet-management.md)
2. **정책 설정**: 거래 한도, 토큰 제한 등 보안 정책 구성 → [Policy Management](./policy-management.md)
3. **DeFi 설정**: DeFi 프로바이더 활성화 → [DeFi Provider Configuration](./defi-providers.md)
4. **데몬 운영**: 백업, Webhook, Kill Switch 등 운영 기능 → [Daemon Operations](./daemon-operations.md)
