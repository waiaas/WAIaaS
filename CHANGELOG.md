# Changelog

## [2.16.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.16.0-rc...v2.16.0) (2026-04-21)


### Bug Fixes

* promote v2.16.0-rc to stable 2.16.0 ([852f4e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/852f4e6036b52e093f1682e508fc5b8fc93507ea))
* promote v2.16.0-rc to stable 2.16.0 ([f507fbe](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f507fbef7a437a6897fd0434aaad76e8e1547df7))

## [2.16.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.15.0...v2.16.0-rc) (2026-04-21)


### Features

* **push-relay:** Pushwoosh extra_fields configuration support ([ca989f3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca989f362ca790ddc05981ed329d60af13593326))
* **push-relay:** Pushwoosh extra_fields for v2.16.0-rc ([de914be](https://github.com/minhoyoo-iotrust/WAIaaS/commit/de914beb35d68043f4544be5efa54d36360e1ac9))

## [2.15.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.15.0...v2.15.0) (2026-04-20)


### Features

* **01-01:** extend buildContractCall() with OfferCreate/OfferCancel routing ([135ed5e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/135ed5eeba083d0095b938d4f26f80994caa45c0))
* **01-02:** add OfferCreate/OfferCancel CONTRACT_CALL parsing to tx-parser ([1d67639](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d676390108848bb8fec46eb0ea77e5fa27debd6))
* **02-01:** add OfferBuilder with currency amount conversion and reserve validation ([b75b003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b75b0030a17440e2f67f93e1ae3c8bcdbab9a236))
* **02-01:** add XrplOrderbookClient RPC wrapper for orderbook queries ([b334932](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b334932c382f1cbbbefd5142a756aa213f2ac8f4))
* **02-01:** add Zod input schemas for 5 XRPL DEX actions ([bf58b9e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf58b9ed8ee55dfd9fa8600d8231983c8ab41544))
* **02-02:** extend buildContractCall for TrustSet + register XrplDexProvider ([d1b37ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1b37ac8ec59e0dab72ab4b82c3de03e468137a5))
* **02-02:** implement XrplDexProvider with 5 actions ([0448d7b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0448d7b07bca0b60b71837bc10fbdea2b4e83a5f))
* **02-03:** register xrpl_dex in builtin-metadata and setting keys ([2b77125](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2b7712563aa2e3208fc467406dc2469d921f7c8f))
* **03-01:** resolveEffectiveAmountUsd XRPL DEX calldata parsing ([92f86d8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92f86d83eaaad253206e219557092a98833d45a8))
* **03-02:** Admin UI transaction type labels + XRPL DEX display ([b360587](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3605879f87aa0da00b22c96cf7289dddce4543f))
* **459-01:** create Tauri spike project with @reown/appkit integration ([a924e7a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a924e7a8f8d77cb305a61e9acb5320ba0b35362a))
* **460-01:** Tauri 2 project scaffolding + SidecarManager implementation ([8fb9b4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8fb9b4e43ec5cccaf11e1378ecfe44da887cc412))
* **460-02:** SEA binary build pipeline + native-loader + dynamic port output ([6c4e8ca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c4e8ca9ea8e7a14a1d269080365e1ff2ca809e3))
* **460-03:** splash -&gt; daemon start -&gt; WebView navigate integration ([85b4173](https://github.com/minhoyoo-iotrust/WAIaaS/commit/85b41734d91456f3ffc576570051a53ab31391a3))
* **461-01:** add 4-layer tree-shaking config and CI bundle verification ([2aae71b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2aae71beca2c8828d15d4cf1e3a010c2f4062a41))
* **461-01:** add quit_app IPC command, isDesktop() detection, and TS bridge wrappers ([24b43f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24b43f1ff62151fbdadc27960da5b50f5aa9b4cb))
* **461-02:** add system tray module with 3-color icons, context menu, and 30s health polling ([43412e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43412e745444295e2bf2fb6b04aea86f6c259ade))
* **461-02:** integrate system tray in main.rs with tray-icon and image-png features ([00b1116](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00b11161895e5cb9072a4c709e6d671b47377c65))
* **462-01:** Setup Wizard orchestrator + App.tsx dynamic import integration ([7c19769](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c19769b19cf9cd6681f232c7e5f7d0c30358880))
* **462-01:** wizard store + 5 step components for Desktop Setup Wizard ([b4b89af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4b89afefb1e834eef8ed0ac401c0e3955e56fff))
* **462-02:** WalletConnect QR connector + modal via daemon REST API (Plan B) ([7153984](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7153984cb4a7aa5eba7181e98c7b7dcd73853994))
* **462-03:** wire Owner step to WalletConnect QR modal via dynamic imports ([5cb0c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cb0c992201c2b8d7a096f265405e4799b4a8359))
* **463-01:** integrate Tauri updater plugin with Ed25519 signing config ([17ce11b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17ce11be358bcfee3b53a7e62bdd52837ce03fb4))
* **463-02:** add 3-platform desktop release CI workflow ([bff990d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bff990d7c66ba0555d114ccefb6d7de22419d1a9))
* **463-03:** add auto-update UI with UpdateBanner and update-checker ([3348fa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3348fa3d6541ea159e5b3c23525fedc246bb6cb5))
* **465-01:** add download page with OS detection and GitHub API integration ([14c6373](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14c63733ce852ac03412d0f78ab74e242462ab9b))
* **466-01:** add Desktop App distribution channels to SUBMISSION_KIT ([48ef4ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/48ef4ad6c4020aef9b1ff12cd1d260ebd47f61cd))
* **466-01:** add Download link to site navigation and sitemap ([d8b8efd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8b8efdc2e1d9ffdcfdf7871bcbae7e5ccc96354))
* **467-01:** add DB v61 migration with signing primary partial unique index ([6567dac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6567dac33e47039a8830d855ee950aaf3d6d5a72))
* **467-02:** add exclusive signing toggle to WalletAppService ([cab2d96](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cab2d965fae3d1409ec9cc294071ec9bfc071b2b))
* **467-02:** transition PresetAutoSetupService from preferred_wallet to signing_enabled ([c9bd1e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9bd1e1fe65c26524a0b305822145c3fa8cb0153))
* **468-01:** transition SignRequestBuilder to wallet_type + signing_enabled=1 query ([35d1589](https://github.com/minhoyoo-iotrust/WAIaaS/commit/35d1589603a495090f4b768dad65148b0a441ecc))
* **469-01:** wallet_type group layout + signing radio buttons ([8156083](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8156083b82e4536df0517cf0bcf6707155e58f42))
* **470-01:** extend core chain enums, constants, and RPC defaults for ripple ([e33e08b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e33e08b4766a7a201120350e7461063a3db34637))
* **470-01:** register ripple ChainType and XRPL NetworkTypes in shared SSoT ([9374c44](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9374c44f5dfa93625c5a624a403f0ea9ae25e198))
* **470-02:** register XRPL CAIP-2 chain IDs and CAIP-19 asset identifiers ([d7329e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d7329e54f348a4aedaaa6bf6cfbe701012c16c30))
* **470-03:** add ripple chain stub to AdapterPool with RPC config key mapping ([ccd91f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ccd91f4ea1d6ab75b1aaf5a1368b8789d2b35a65))
* **470-03:** DB v62 migration -- add ripple chain and XRPL networks to CHECK constraints ([8963385](https://github.com/minhoyoo-iotrust/WAIaaS/commit/89633857592826275f2fbb6bb73613dc49e5d7af))
* **471-01:** scaffold @waiaas/adapter-ripple package with RippleAdapter, KeyStore ripple support, and XRPL RPC config ([e67f737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e67f73788a0ec4c5769b5b9e27f64d7951fb20c3))
* **471-02:** wire AdapterPool for ripple chain and add unit tests ([8d304fc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d304fc0a42658dab17b5e09f1d1284a8ab5be4b))
* **472-01:** implement getTokenInfo, getAssets Trust Lines, and tx-parser IOU precision ([e79678a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e79678a91b32cdb44101e64657b1890963d16db2))
* **472-01:** implement Trust Line currency utils, TrustSet, and IOU transfer ([b3b2fc5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3b2fc50a886e0e43965b2ed45fc5677871e9066))
* **473-01:** add ripple support to getNativeTokenInfo and NFT indexer ([2a685ed](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a685ede8d45ebeceb4a1d6d246b6b14f9d90a6a))
* **473-01:** implement XLS-20 NFT adapter and core schema extension ([b30e07b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b30e07bba43b28f2a8f3089dc09c0aafdcb42b11))
* **473-02:** add Ripple chain support to Admin UI wallet creation and RPC settings ([3fdd7bd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fdd7bd145ebe06dcf60a23e53a9de00b09b7747))
* **473-02:** extend OpenAPI and SDK chain enums with ripple ([916adc4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/916adc41d2a7df4cba070ee4ac2d1864b9a04d35))
* **daemon,admin:** add test sign request for wallet apps ([#450](https://github.com/minhoyoo-iotrust/WAIaaS/issues/450)) ([d46e79e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d46e79e856e5e3db5bc7cbb3e4ace71e7f187020))
* **daemon,push-relay:** fix [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, fix [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) static_fields wiring ([521b7ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/521b7ac6eb0ac4908efdecaf9d95fefeb0143f55))
* **desktop:** auto-provision 3 mainnet wallets on first boot (issue 497) ([babf10e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/babf10ec592144aeb93a59190691700288da054e))
* **desktop:** auto-provision 3 mainnet wallets on first boot (issue 497) ([1852c62](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1852c6262a5f2a41c2f1f15d4911df1d592e9c93))
* **desktop:** auto-provision mainnet wallets (issue 497) ([ce1d2e3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce1d2e3bc3e7bd1f131de0748b20c8b2d6e7687c))
* integrate Dev.to blog posts into waiaas.ai/blog ([f9e74bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9e74bb79a0e34885816ab091c89701f578f6c56))
* **push-relay:** add Pushwoosh extra_fields config (issue 499) ([105e561](https://github.com/minhoyoo-iotrust/WAIaaS/commit/105e561973532e1949b69a96af0ca92e6c566ba8))
* **push-relay:** add Pushwoosh extra_fields config for notification payload (issue 499) ([e3a30d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e3a30d1fcb6fa4fbea9f4f0b37480ae9cfb160e2))
* **push-relay:** enhance debug logging for push payloads and sign responses ([#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458)) ([745fcee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/745fcee239c744ee7202ac8b541a0007fca8d26a))
* **settings:** enable XRPL DEX provider by default ([a3c7f86](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a3c7f86444fdb3ebf4cc162af3e8e976980d9ddd))
* XRP Ledger mainnet support (v33.6) ([79fc0c4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79fc0c47b418a32157d4c525d71546da9dd0dc47))


### Bug Fixes

* **adapter-ripple:** fix typecheck error in test mock casts ([b294075](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b2940758389e10f29f6e369e6621ac87802995a6))
* **adapter-ripple:** remove unused variable declarations in test file ([18f4b25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18f4b25ab7df3ca1a1c21f3f281bb313eb09497f))
* **adapter-ripple:** use default import for xrpl CJS module to fix ESM named export failure ([#481](https://github.com/minhoyoo-iotrust/WAIaaS/issues/481)) ([e7fbc18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7fbc18a545d9407a3fb488d16294aef8a259c16))
* add missing type field to tauri.conf.json extra-file in release-please config ([590d0dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/590d0dc6a384ed6e61ee2fe7f9dcf48661e1293e))
* add subscription staggering and ILogger injection for IncomingTxMonitor ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429), [#430](https://github.com/minhoyoo-iotrust/WAIaaS/issues/430)) ([f129a3c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f129a3c76a149f07f9dea58f699f76ec6989dcd5))
* **admin,push-relay:** resolve issues 432-436 ([1ba3cb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ba3cb8fb36f3f1582f70aba0ad05e67255000d7))
* **admin,push-relay:** resolve issues 432-436 ([0280d2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0280d2e409c616f042eeb3d30e07b2ed16439a07))
* **ci:** add required sections to xrpl-dex UAT scenario ([831367c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/831367c46a756eb49696c44852257dd1b63edf2d))
* **ci:** add workspace build step to desktop release pipeline ([#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471)) ([689a974](https://github.com/minhoyoo-iotrust/WAIaaS/commit/689a974040550470c842cb9d59177a9f79527b84))
* **ci:** add xrpl-dex to E2E provider coverage map ([08e0b6a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/08e0b6ad16d1548d747f2fecba2e79488dca4026))
* **ci:** disable Windows desktop build, restore release-please version sync ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([a8d5a02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a8d5a02662897b77d0ad1b60d9265cafc46c813a))
* **ci:** exclude desktop-v tags from RC auto-detection in promote workflow ([7167eef](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7167eef8fdfa2b6dd0c7a64ea23b8f470e4fa921))
* **ci:** fix release pipeline startup_failure ([a43930b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a43930b0e4aae6a6ff552938d8a3182fd4805a15))
* **ci:** install desktop deps separately and use npx --prefix ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([91c6519](https://github.com/minhoyoo-iotrust/WAIaaS/commit/91c6519e8a42c5f4ac2c29854bcb83b8ec594000))
* **ci:** mark desktop RC releases as prerelease on GitHub ([20eab21](https://github.com/minhoyoo-iotrust/WAIaaS/commit/20eab2192241cb2648d9247824b8665a494e56cd))
* **ci:** mark desktop RC releases as prerelease on GitHub ([#476](https://github.com/minhoyoo-iotrust/WAIaaS/issues/476)) ([535c70f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/535c70f9ad519ab2275b76e51a90c765fd73b581))
* **ci:** merge approval-gate into deploy job to eliminate double approval ([#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470)) ([9a8a2f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9a8a2f5a5fe402f236b51b44366cb48b82cce14d))
* **ci:** read version from package.json instead of GitHub Releases API ([#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457)) ([b73449e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b73449ea92fdc7a795996752395b0fb49d7f1e1d))
* **ci:** register xrpl-dex scenario defi-17 in UAT index ([83359b6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83359b61861a997793849e9aacfefa58e1c4dd92))
* **ci:** remove misplaced cross-package test from actions package ([0a382cd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a382cd04197c6c3c124e96421023cca378760f7))
* **ci:** remove tauriScript to let tauri-action install CLI itself ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([ce9c2d9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce9c2d9c12cd5cd41503ea10e8ee234a96d439f7))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([b07cc20](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b07cc209050b6deaae862a2301198594fced7937))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([616eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/616eec96d10ede61d9bcebcbd47e1a933d08a910))
* **ci:** restore environment: production on deploy job for npm OIDC auth ([75c4dc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75c4dc10a38822d12b6fa22556ae06aee361fc86))
* **ci:** scope desktop build to daemon/CLI packages only ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b94bb37](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b94bb376e7f0baa48028a3f9a4be7480d9d8f95a))
* **ci:** update enum SSoT expected counts for ripple chain ([d1ccce6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1ccce6002aa2f6b5fc26a6248553fe423a84816))
* **ci:** update enum SSoT expected counts for xrpl_dex settings ([79e433c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79e433cd632c75beb88d3077d1b016c9e7154c69))
* **ci:** use correct package name @waiaas/desktop in turbo filter ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([03bfcd6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03bfcd65f805a029adaf981ae0d52ff6c8175781))
* **ci:** use npx tauri instead of pnpm tauri for CLI resolution ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([5cf1804](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cf18049f43df023f220e5432864ed77e4ecee90))
* **ci:** use pnpm --filter instead of turbo --filter for desktop build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([1f17747](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f17747f7b5fead2ca527d5670918f49cd47e7d7))
* **ci:** use RELEASE_PAT for release-please auto-merge and add synchronize trigger ([0a7706f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a7706f5864bbbfdde153fbefeeca9ccdf5cb139))
* **ci:** use turbo --filter=@waiaas/cli... for scoped SEA build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([33cf737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/33cf73750d2fece181fa217552f6bb06293a51a8))
* concise error messages for viem errors + register issue [#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431) ([b9cd4cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b9cd4ccd08b14be58adb2ec375de0a862263e30c))
* **daemon,admin,push-relay:** resolve issues 451-452 — sign request push body and toast args ([e24940c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e24940c1b23720ce3899c3322ccb7a07513b8043))
* **daemon,admin:** resolve issues 437-442 ([81e7405](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81e7405a4da1685476675ba9cec1d1c5332ec7ff))
* **daemon,wallet-sdk:** add owner address to test sign request ([#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)) and remove ntfy remnants ([#463](https://github.com/minhoyoo-iotrust/WAIaaS/issues/463)) ([81092e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81092e71bc3df8df792fdc8c7314b9fd52128816))
* **daemon:** add missing ripple-keypairs dependency for XRP wallet creation ([b4f42c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4f42c8e4d6b81e0a715dd1347b01e08ffaf6333))
* **daemon:** extract buildSignRequestPushPayload helper to fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) base64 format bug ([7788c66](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7788c669d6d936df5b56c0d49b00aeae5a7dcba6))
* **daemon:** fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) admin test sign request base64 format bug ([1981a78](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1981a78f21ad0f9bc2050f1c962685515afa7e11))
* **daemon:** promote startup step logs from debug to info level ([75d5ec8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75d5ec8a4f8299b1974643583f39d7d60cb5db09))
* **daemon:** remove OpenAPI body schema from test-sign-request to allow empty body ([d8e63d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8e63d1545a40afe9bf8f0704b4b2f2828c1ee80))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([290fed4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/290fed49d0ddbbc94e90213ac2c4a820bcbd3719))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([d6c462c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6c462cc613ce9cf1fed6667e7c57b48d0bb0973))
* **daemon:** resolve issue 449 — use subscription_token for Push Relay routing ([42ebfb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42ebfb84174c79c832a00079eb95f7771216ec80))
* **daemon:** resolve issues 443-444 — approval timeout policy passthrough and hot-reload ([441a431](https://github.com/minhoyoo-iotrust/WAIaaS/commit/441a431615660fd8112e0972353e021bd816464d))
* **daemon:** resolve issues 446-448 — DELAY cancel keyboard and TX_QUEUED notification enrichment ([c1e97ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1e97ba3a0c00c403ee613b04e5fd3e024d73281))
* **daemon:** send flat SignRequest fields in Push Relay payload ([#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456)) ([8c1d0e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c1d0e528f2cee93121874dd64584ac36e5b06a7))
* DB migration column order, MCP race condition, desktop dev mode ([32e3ebb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32e3ebb8106ddc827c329d2544135c9f5b95bc1a))
* **db:** use explicit column lists in v62 migration to fix column order mismatch ([#480](https://github.com/minhoyoo-iotrust/WAIaaS/issues/480)) ([8d3b499](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d3b4994a4fdf753558c6f70b65a5cd3538271a0))
* defer PositionTracker sync and increase stagger delay ([#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431)) ([ca8613d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca8613d6935661873ae8ffe6f9bcba8a55b780b6))
* desktop build pipeline — issues [#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472) [#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473) [#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474) ([f399203](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f39920318c4e4480d6bd1530c5dabe9a01ec7a59))
* **desktop:** add beforeDevCommand and redesign tray icons ([1232089](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12320899d3829ff9d1fb69f00fe2a16ef6e4a584))
* **desktop:** add icon.ico/icon.icns and remove Apple signing env ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([3fe9779](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fe9779a5f372be0dc45e5638415fb2b224cc487))
* **desktop:** add legacy Solana deps to esbuild external list ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([7705b2f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7705b2fe8b61a81b13e99f5a8b623dde4a46f626))
* **desktop:** add remaining Solana transitive deps to esbuild external ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b46972e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b46972e4c3853fc94df67096037f79dbe9be2081))
* **desktop:** add sodium-native direct require intercept in SEA shim (issue 493) ([9d29a35](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d29a3544b8f308be81168e75f2c4a95116f644e))
* **desktop:** add sodium-native direct require intercept in SEA shim (issue 493) ([a6e3689](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6e3689ab9000c9852fab50279b4f519ec2c5ded))
* **desktop:** auto-login with bootstrap recovery.key (issue 491) ([0e1da94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0e1da94705bff9cbb2ec57da92c3b90125f34805))
* **desktop:** auto-login with bootstrap recovery.key (issue 491) ([8dd5bec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8dd5bec42d15e1c9725c5e79494cc9e1da54f7ea))
* **desktop:** auto-login with bootstrap recovery.key (issue 491) ([b0cd47f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0cd47f723a81d411ef44a9520daa5812ca00d1e))
* **desktop:** decouple desktop version from release-please ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([950e8c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/950e8c66382eee16bad40c1e0dab818a7f42acdb))
* **desktop:** re-authenticate via recovery.key after session timeout (issue 498) ([7f6841b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f6841bf4133cf692fb9b419f5a98ff82915b8f0))
* **desktop:** re-authenticate via recovery.key after session timeout (issue 498) ([bd3f7d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd3f7d6d31d598ecccf6985c626ab7d9915ef4ae))
* **desktop:** re-authenticate via recovery.key after session timeout (issue 498) ([19f3c0f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19f3c0ff7adf6ab318879128f94bef8f611ca139))
* **desktop:** remove Owner step from Setup Wizard (issue 495) ([cdbbcb9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cdbbcb9689aa9b426391f0bde8032822ce1058e1))
* **desktop:** remove Owner step from Setup Wizard (issue 495) ([1d6ef56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d6ef56eb429acbacf1572995359df933eda7e8c))
* **desktop:** remove Owner step from wizard (issue 495) ([1ab299f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ab299fae38f8a74f59bc0da2002206c691485d0))
* **desktop:** replace placeholder icons with favicon-based icon set ([#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474)) ([d0980c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0980c3ff14429f92841b17e367a9ec13df70292))
* **desktop:** SEA createRequire strip + Module._load intercept (issue 494) ([7cf66d0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7cf66d0961bd4b5ecedd0bebd7f12efd1b0743ec))
* **desktop:** set Ed25519 updater public key in tauri.conf.json ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([8bfc4bf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8bfc4bffb5ab8a5f596b84678c8c943ee8b9330d))
* **desktop:** skip wizard + default environment mainnet (issue 496) ([23b2f17](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23b2f176e8f7d1d0ffd097009771c08962d29ce5))
* **desktop:** skip wizard entirely + default environment mainnet (issue 496) ([d7afc89](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d7afc89ccd6d50c74b48dc5e7360089192df34a5))
* **desktop:** skip wizard entirely on Desktop (issue 496) ([3cdcba7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3cdcba7903f7e4f3604ce76e47e7afa495e5e554))
* **desktop:** skip wizard entirely on Desktop (issue 496) ([1629951](https://github.com/minhoyoo-iotrust/WAIaaS/commit/16299518c826cdbdf2f842debe5cfb13b72121d9))
* **desktop:** sodium-native SEA shim intercept (issue 493) ([7f5a03b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f5a03b9e2eafc5889811ca038ba3710e1430bd0))
* **desktop:** strip createRequire in SEA bundle + Module._load intercept (issue 494) ([4b3f93d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4b3f93d462aeaf278411f403a6adccbb964bd07a))
* **desktop:** strip createRequire in SEA bundle + Module._load intercept (issue 494) ([f43a3fa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f43a3fa1e6362ab71cc1a028b72ab539650a7f71))
* **desktop:** unbrick v2.14.0 first-launch (issues 485-490) ([a696425](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a696425a672feab202bcfb7e8676914b9055c028))
* **desktop:** unbrick v2.14.0 first-launch (issues 485-490) ([c0e7db9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c0e7db91c2852595589ba6f787e8515514373543))
* **desktop:** unbrick v2.14.0 first-launch (issues 485-490) ([03d8182](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03d8182ceecf33c2e86fa93baded492522e7813e))
* **desktop:** update Windows API calls for windows crate v0.58 ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([2759796](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2759796ec182500079fb339c81cab565e352cd4a))
* **desktop:** use fixed port 3100 instead of dynamic port 0 ([#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473)) ([46dd1b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46dd1b2b0317954e0769ddb3573f1137eee649d8))
* **desktop:** wizard wallet auth + SSoT chain multi-select (issue 492) ([aad812e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aad812ef0922a4bae05f3f32f31b1f33b7e31504))
* **desktop:** wizard wallet auth + SSoT chain multi-select (issue 492) ([eab69ef](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eab69efcce442e3bd9b2f11b24a5b7fa197fc750))
* extract concise one-line error messages from viem errors ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429)) ([1aed766](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1aed7662ddeab8b466b14f0648f1985f5ac28097))
* IncomingTxMonitor startup stability and auto-merge CI ([596805b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/596805bbfcf3c0b81f9a4232c7c8ba52b2d96955))
* **lint:** rename unused catch variables to _err in RippleAdapter ([a51a92a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a51a92a5a2558f94d64fe254733b4febcef4e936))
* **mcp:** await registerActionProviderTools before server.connect ([#479](https://github.com/minhoyoo-iotrust/WAIaaS/issues/479)) ([4d1d822](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d1d822accd9bc939f89842db31e7d5c8c701917))
* **mcp:** extract PKG_VERSION to version.ts to avoid ESM circular import ([8ab3f9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ab3f9f87b7265b272d5d474655bfd6eae4bde90))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([07a41f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07a41f295e3592185beb278f051468a3f25817ad))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([cffc072](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cffc072b209313ab5ff62f719df0ae3953964cc6))
* promote v2.12.0-rc.16 to stable 2.12.0 ([95b33a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95b33a06e8b3e2be9fd161ae8005dff26db76dd4))
* promote v2.13.0-rc.8 to stable 2.13.0 ([ab194d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ab194d26cf941b4ffa8db7a40f7c34ef64523ca2))
* promote v2.14.0-rc.4 to stable 2.14.0 ([c4804c9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c4804c971139bda53c3107669459b7440778eff9))
* promote v2.14.0-rc.4 to stable 2.14.0 ([acf8d35](https://github.com/minhoyoo-iotrust/WAIaaS/commit/acf8d356327465a99485d3116305e621d62f2647))
* promote v2.15.0-rc.6 to stable 2.15.0 ([71591f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71591f2bba9b56618b0fbff522b7f332b5fb05d9))
* promote v2.15.0-rc.6 to stable 2.15.0 ([4db14b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4db14b25c52b37049f2416f3850a95aeaec23bb4))
* **push-relay:** make extra_fields optional in constructor ([c7f9ead](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c7f9eadb9da3f96ca35b472310ebf3dedc35c5e6))
* **push-relay:** make extra_fields optional in PushwooshProvider constructor ([5c3309e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5c3309e334e14f06586cd5bf2cc05756b35adf84))
* **release-please:** track adapter-ripple package.json version ([b4d0caf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4d0cafe45be0fc3ef871db85c6bca2fe1adef81))
* **release:** add adapter-ripple to smoke test packing list ([e48c437](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e48c4379157e1c54c5b934ae8468ec0404747d97))
* **release:** add adapter-ripple to smoke test packing list ([fbc1867](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fbc18672cd61ae0e619c3860cfb93a9dc2eba3aa))
* **release:** include adapter-ripple in Dockerfile and release pipeline ([ae5670c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae5670c24f3ca4949f62a66a0ebb3b452aabdb49))
* **release:** include adapter-ripple in Dockerfile and release pipeline ([23df43d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23df43d8e7913cc0497ec92ddc664fd829242c12))
* remove build script from desktop-spike to unblock CI ([bf21754](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf21754a1847745a29aeec1827092076bd37e9a9))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — DeFi UAT fixes, RPC pool seeding, DCent swap corrections ([885531d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/885531db15e06d379d0843280a401945379e96d6))
* resolve issues [#469](https://github.com/minhoyoo-iotrust/WAIaaS/issues/469) [#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470) [#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471) ([1547af0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1547af0c7d1cc84cc1c1d312f2b885eee2c6da3a))
* resolve open issues [#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456), [#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457), [#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458) ([ff0d22c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff0d22c757eb6707b264195e642352dd125bff16))
* resolve open issues [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) push relay static_fields ([ae308fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae308fb3383eeee52e58235918baf791cfa4be22))
* resolve open issues [#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)-[#464](https://github.com/minhoyoo-iotrust/WAIaaS/issues/464) — owner address, ntfy cleanup, docs update ([825f4aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/825f4aa6f9dd0d48f9bee754e5b79877b35b86b5))
* resolve open issues 437-452 ([c6cb6d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6cb6d7b45ee64dd9ed18917d246423c9cb824bb))
* **security:** update openclaw for GHSA-f6pf-4gjx-c94r ([762bbd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/762bbd4b66be8e0693a124e5657c546703b1f7ac))
* **security:** update openclaw to &gt;=2026.3.28 for GHSA-f6pf-4gjx-c94r ([f30d660](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f30d660d85fbf19140be205863b37a96311d0100))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([3848624](https://github.com/minhoyoo-iotrust/WAIaaS/commit/384862499a0eb9a3f399501eb0a6202bf30088d5))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([#465](https://github.com/minhoyoo-iotrust/WAIaaS/issues/465), [#466](https://github.com/minhoyoo-iotrust/WAIaaS/issues/466), [#467](https://github.com/minhoyoo-iotrust/WAIaaS/issues/467)) ([038ee36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/038ee36ca0772382b68b7bc7926a4e554737b194))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([f2275dd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f2275dd2a3019b617bd2c2a5ba2f52eee22e1ded))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([888c902](https://github.com/minhoyoo-iotrust/WAIaaS/commit/888c902ba176a01b322c8e400e5c4f0790380b44))
* **site:** add state=all to Dev.to API query to include all published posts ([88930f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88930f0fdd196d00f43508e401a9220fb4676e06))
* **site:** bypass Dev.to CDN cache with API key authentication ([9fc4bab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fc4babdb2ed94433e288e1eab7c8e2507afee69))
* **site:** pass API key to individual Dev.to article fetches ([a6675ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6675ee2d968e5a5c5a5cba9fae2078970903add))
* **site:** replace Korean fallback text with English on download page ([4f4a8ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f4a8eec3eaab091268a1bcbcba39a0e57d294ab))
* **solana:** resolve eslint no-this-alias and no-unsafe-function-type errors ([187be72](https://github.com/minhoyoo-iotrust/WAIaaS/commit/187be727efcfd14ab3456c920a9da0cc3549806d))
* **solana:** resolve require-yield lint errors in test async iterables ([54fc046](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54fc0469b248e907dbcb525649e89f4902f616ec))
* update pnpm-lock.yaml for Tauri desktop dependencies ([f3b5c94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3b5c94e703556c83b6c89ef53e6e76810209d55))
* **wallet-sdk:** simplify decodeInlineData to restore 100% coverage ([7780a24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7780a24cd07c6be65f611a92542cdfbed7360142))
* XRPL stabilization — ripple-keypairs dep, ESM import fix, DEX default enable ([32efa47](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32efa479b94ecf5b0fd35b0ee00f02fc0f9f3741))
* **xrpl:** resolve 3 critical XRPL bugs and add token registry support ([4e881c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e881c8ba67a30a1faca97b6ba6973ae3df13a39))
* **xrpl:** resolve 3 critical XRPL bugs and add token registry support ([fc65b22](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc65b222f22e0e170411d0ebade0b81661052bab))

## [2.15.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.15.0...v2.15.0) (2026-04-20)


### Features

* **push-relay:** add Pushwoosh extra_fields config (issue 499) ([105e561](https://github.com/minhoyoo-iotrust/WAIaaS/commit/105e561973532e1949b69a96af0ca92e6c566ba8))
* **push-relay:** add Pushwoosh extra_fields config for notification payload (issue 499) ([e3a30d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e3a30d1fcb6fa4fbea9f4f0b37480ae9cfb160e2))


### Bug Fixes

* **desktop:** re-authenticate via recovery.key after session timeout (issue 498) ([7f6841b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f6841bf4133cf692fb9b419f5a98ff82915b8f0))
* **desktop:** re-authenticate via recovery.key after session timeout (issue 498) ([bd3f7d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd3f7d6d31d598ecccf6985c626ab7d9915ef4ae))
* **desktop:** re-authenticate via recovery.key after session timeout (issue 498) ([19f3c0f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19f3c0ff7adf6ab318879128f94bef8f611ca139))
* **push-relay:** make extra_fields optional in constructor ([c7f9ead](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c7f9eadb9da3f96ca35b472310ebf3dedc35c5e6))
* **push-relay:** make extra_fields optional in PushwooshProvider constructor ([5c3309e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5c3309e334e14f06586cd5bf2cc05756b35adf84))

## [2.15.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.15.0-rc.6...v2.15.0) (2026-04-13)


### Bug Fixes

* promote v2.15.0-rc.6 to stable 2.15.0 ([71591f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71591f2bba9b56618b0fbff522b7f332b5fb05d9))
* promote v2.15.0-rc.6 to stable 2.15.0 ([4db14b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4db14b25c52b37049f2416f3850a95aeaec23bb4))

## [2.15.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc.6...v2.15.0-rc.6) (2026-04-12)


### Features

* **desktop:** auto-provision 3 mainnet wallets on first boot (issue 497) ([babf10e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/babf10ec592144aeb93a59190691700288da054e))
* **desktop:** auto-provision 3 mainnet wallets on first boot (issue 497) ([1852c62](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1852c6262a5f2a41c2f1f15d4911df1d592e9c93))
* **desktop:** auto-provision mainnet wallets (issue 497) ([ce1d2e3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce1d2e3bc3e7bd1f131de0748b20c8b2d6e7687c))

## [2.14.1-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc.5...v2.14.1-rc.6) (2026-04-10)


### Bug Fixes

* **desktop:** skip wizard + default environment mainnet (issue 496) ([23b2f17](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23b2f176e8f7d1d0ffd097009771c08962d29ce5))
* **desktop:** skip wizard entirely + default environment mainnet (issue 496) ([d7afc89](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d7afc89ccd6d50c74b48dc5e7360089192df34a5))
* **desktop:** skip wizard entirely on Desktop (issue 496) ([3cdcba7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3cdcba7903f7e4f3604ce76e47e7afa495e5e554))
* **desktop:** skip wizard entirely on Desktop (issue 496) ([1629951](https://github.com/minhoyoo-iotrust/WAIaaS/commit/16299518c826cdbdf2f842debe5cfb13b72121d9))

## [2.14.1-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc.4...v2.14.1-rc.5) (2026-04-10)


### Bug Fixes

* **desktop:** remove Owner step from Setup Wizard (issue 495) ([cdbbcb9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cdbbcb9689aa9b426391f0bde8032822ce1058e1))
* **desktop:** remove Owner step from Setup Wizard (issue 495) ([1d6ef56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d6ef56eb429acbacf1572995359df933eda7e8c))
* **desktop:** remove Owner step from wizard (issue 495) ([1ab299f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ab299fae38f8a74f59bc0da2002206c691485d0))

## [2.14.1-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc.3...v2.14.1-rc.4) (2026-04-09)


### Bug Fixes

* **desktop:** SEA createRequire strip + Module._load intercept (issue 494) ([7cf66d0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7cf66d0961bd4b5ecedd0bebd7f12efd1b0743ec))
* **desktop:** strip createRequire in SEA bundle + Module._load intercept (issue 494) ([4b3f93d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4b3f93d462aeaf278411f403a6adccbb964bd07a))
* **desktop:** strip createRequire in SEA bundle + Module._load intercept (issue 494) ([f43a3fa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f43a3fa1e6362ab71cc1a028b72ab539650a7f71))

## [2.14.1-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc.2...v2.14.1-rc.3) (2026-04-09)


### Bug Fixes

* **desktop:** add sodium-native direct require intercept in SEA shim (issue 493) ([9d29a35](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d29a3544b8f308be81168e75f2c4a95116f644e))
* **desktop:** add sodium-native direct require intercept in SEA shim (issue 493) ([a6e3689](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6e3689ab9000c9852fab50279b4f519ec2c5ded))
* **desktop:** sodium-native SEA shim intercept (issue 493) ([7f5a03b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f5a03b9e2eafc5889811ca038ba3710e1430bd0))

## [2.14.1-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc.1...v2.14.1-rc.2) (2026-04-09)


### Bug Fixes

* **desktop:** wizard wallet auth + SSoT chain multi-select (issue 492) ([aad812e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aad812ef0922a4bae05f3f32f31b1f33b7e31504))
* **desktop:** wizard wallet auth + SSoT chain multi-select (issue 492) ([eab69ef](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eab69efcce442e3bd9b2f11b24a5b7fa197fc750))

## [2.14.1-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.1-rc...v2.14.1-rc.1) (2026-04-09)


### Bug Fixes

* **desktop:** auto-login with bootstrap recovery.key (issue 491) ([0e1da94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0e1da94705bff9cbb2ec57da92c3b90125f34805))
* **desktop:** auto-login with bootstrap recovery.key (issue 491) ([8dd5bec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8dd5bec42d15e1c9725c5e79494cc9e1da54f7ea))
* **desktop:** auto-login with bootstrap recovery.key (issue 491) ([b0cd47f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0cd47f723a81d411ef44a9520daa5812ca00d1e))

## [2.14.1-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.0...v2.14.1-rc) (2026-04-08)


### Bug Fixes

* **desktop:** unbrick v2.14.0 first-launch (issues 485-490) ([a696425](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a696425a672feab202bcfb7e8676914b9055c028))
* **desktop:** unbrick v2.14.0 first-launch (issues 485-490) ([c0e7db9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c0e7db91c2852595589ba6f787e8515514373543))
* **desktop:** unbrick v2.14.0 first-launch (issues 485-490) ([03d8182](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03d8182ceecf33c2e86fa93baded492522e7813e))

## [2.14.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.0-rc.4...v2.14.0) (2026-04-08)


### Bug Fixes

* promote v2.14.0-rc.4 to stable 2.14.0 ([c4804c9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c4804c971139bda53c3107669459b7440778eff9))
* promote v2.14.0-rc.4 to stable 2.14.0 ([acf8d35](https://github.com/minhoyoo-iotrust/WAIaaS/commit/acf8d356327465a99485d3116305e621d62f2647))

## [2.14.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.0-rc.3...v2.14.0-rc.4) (2026-04-07)


### Bug Fixes

* **release-please:** track adapter-ripple package.json version ([b4d0caf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4d0cafe45be0fc3ef871db85c6bca2fe1adef81))

## [2.14.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.0-rc.2...v2.14.0-rc.3) (2026-04-07)


### Bug Fixes

* **release:** add adapter-ripple to smoke test packing list ([e48c437](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e48c4379157e1c54c5b934ae8468ec0404747d97))
* **release:** add adapter-ripple to smoke test packing list ([fbc1867](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fbc18672cd61ae0e619c3860cfb93a9dc2eba3aa))

## [2.14.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.0-rc.1...v2.14.0-rc.2) (2026-04-07)


### Bug Fixes

* **release:** include adapter-ripple in Dockerfile and release pipeline ([ae5670c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae5670c24f3ca4949f62a66a0ebb3b452aabdb49))
* **release:** include adapter-ripple in Dockerfile and release pipeline ([23df43d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23df43d8e7913cc0497ec92ddc664fd829242c12))

## [2.14.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.14.0-rc...v2.14.0-rc.1) (2026-04-07)


### Features

* **01-01:** extend buildContractCall() with OfferCreate/OfferCancel routing ([135ed5e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/135ed5eeba083d0095b938d4f26f80994caa45c0))
* **01-02:** add OfferCreate/OfferCancel CONTRACT_CALL parsing to tx-parser ([1d67639](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d676390108848bb8fec46eb0ea77e5fa27debd6))
* **02-01:** add OfferBuilder with currency amount conversion and reserve validation ([b75b003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b75b0030a17440e2f67f93e1ae3c8bcdbab9a236))
* **02-01:** add XrplOrderbookClient RPC wrapper for orderbook queries ([b334932](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b334932c382f1cbbbefd5142a756aa213f2ac8f4))
* **02-01:** add Zod input schemas for 5 XRPL DEX actions ([bf58b9e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf58b9ed8ee55dfd9fa8600d8231983c8ab41544))
* **02-02:** extend buildContractCall for TrustSet + register XrplDexProvider ([d1b37ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1b37ac8ec59e0dab72ab4b82c3de03e468137a5))
* **02-02:** implement XrplDexProvider with 5 actions ([0448d7b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0448d7b07bca0b60b71837bc10fbdea2b4e83a5f))
* **02-03:** register xrpl_dex in builtin-metadata and setting keys ([2b77125](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2b7712563aa2e3208fc467406dc2469d921f7c8f))
* **03-01:** resolveEffectiveAmountUsd XRPL DEX calldata parsing ([92f86d8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92f86d83eaaad253206e219557092a98833d45a8))
* **03-02:** Admin UI transaction type labels + XRPL DEX display ([b360587](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3605879f87aa0da00b22c96cf7289dddce4543f))
* **455-02:** rewrite openclaw-integration.md + add openclaw-plugin SEO page + rebuild site ([b26d493](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b26d49303f9435e4220b3c02011cc353ea546a12))
* **459-01:** create Tauri spike project with @reown/appkit integration ([a924e7a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a924e7a8f8d77cb305a61e9acb5320ba0b35362a))
* **460-01:** Tauri 2 project scaffolding + SidecarManager implementation ([8fb9b4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8fb9b4e43ec5cccaf11e1378ecfe44da887cc412))
* **460-02:** SEA binary build pipeline + native-loader + dynamic port output ([6c4e8ca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c4e8ca9ea8e7a14a1d269080365e1ff2ca809e3))
* **460-03:** splash -&gt; daemon start -&gt; WebView navigate integration ([85b4173](https://github.com/minhoyoo-iotrust/WAIaaS/commit/85b41734d91456f3ffc576570051a53ab31391a3))
* **461-01:** add 4-layer tree-shaking config and CI bundle verification ([2aae71b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2aae71beca2c8828d15d4cf1e3a010c2f4062a41))
* **461-01:** add quit_app IPC command, isDesktop() detection, and TS bridge wrappers ([24b43f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24b43f1ff62151fbdadc27960da5b50f5aa9b4cb))
* **461-02:** add system tray module with 3-color icons, context menu, and 30s health polling ([43412e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43412e745444295e2bf2fb6b04aea86f6c259ade))
* **461-02:** integrate system tray in main.rs with tray-icon and image-png features ([00b1116](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00b11161895e5cb9072a4c709e6d671b47377c65))
* **462-01:** Setup Wizard orchestrator + App.tsx dynamic import integration ([7c19769](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c19769b19cf9cd6681f232c7e5f7d0c30358880))
* **462-01:** wizard store + 5 step components for Desktop Setup Wizard ([b4b89af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4b89afefb1e834eef8ed0ac401c0e3955e56fff))
* **462-02:** WalletConnect QR connector + modal via daemon REST API (Plan B) ([7153984](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7153984cb4a7aa5eba7181e98c7b7dcd73853994))
* **462-03:** wire Owner step to WalletConnect QR modal via dynamic imports ([5cb0c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cb0c992201c2b8d7a096f265405e4799b4a8359))
* **463-01:** integrate Tauri updater plugin with Ed25519 signing config ([17ce11b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17ce11be358bcfee3b53a7e62bdd52837ce03fb4))
* **463-02:** add 3-platform desktop release CI workflow ([bff990d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bff990d7c66ba0555d114ccefb6d7de22419d1a9))
* **463-03:** add auto-update UI with UpdateBanner and update-checker ([3348fa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3348fa3d6541ea159e5b3c23525fedc246bb6cb5))
* **465-01:** add download page with OS detection and GitHub API integration ([14c6373](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14c63733ce852ac03412d0f78ab74e242462ab9b))
* **466-01:** add Desktop App distribution channels to SUBMISSION_KIT ([48ef4ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/48ef4ad6c4020aef9b1ff12cd1d260ebd47f61cd))
* **466-01:** add Download link to site navigation and sitemap ([d8b8efd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8b8efdc2e1d9ffdcfdf7871bcbae7e5ccc96354))
* **467-01:** add DB v61 migration with signing primary partial unique index ([6567dac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6567dac33e47039a8830d855ee950aaf3d6d5a72))
* **467-02:** add exclusive signing toggle to WalletAppService ([cab2d96](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cab2d965fae3d1409ec9cc294071ec9bfc071b2b))
* **467-02:** transition PresetAutoSetupService from preferred_wallet to signing_enabled ([c9bd1e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9bd1e1fe65c26524a0b305822145c3fa8cb0153))
* **468-01:** transition SignRequestBuilder to wallet_type + signing_enabled=1 query ([35d1589](https://github.com/minhoyoo-iotrust/WAIaaS/commit/35d1589603a495090f4b768dad65148b0a441ecc))
* **469-01:** wallet_type group layout + signing radio buttons ([8156083](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8156083b82e4536df0517cf0bcf6707155e58f42))
* **470-01:** extend core chain enums, constants, and RPC defaults for ripple ([e33e08b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e33e08b4766a7a201120350e7461063a3db34637))
* **470-01:** register ripple ChainType and XRPL NetworkTypes in shared SSoT ([9374c44](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9374c44f5dfa93625c5a624a403f0ea9ae25e198))
* **470-02:** register XRPL CAIP-2 chain IDs and CAIP-19 asset identifiers ([d7329e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d7329e54f348a4aedaaa6bf6cfbe701012c16c30))
* **470-03:** add ripple chain stub to AdapterPool with RPC config key mapping ([ccd91f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ccd91f4ea1d6ab75b1aaf5a1368b8789d2b35a65))
* **470-03:** DB v62 migration -- add ripple chain and XRPL networks to CHECK constraints ([8963385](https://github.com/minhoyoo-iotrust/WAIaaS/commit/89633857592826275f2fbb6bb73613dc49e5d7af))
* **471-01:** scaffold @waiaas/adapter-ripple package with RippleAdapter, KeyStore ripple support, and XRPL RPC config ([e67f737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e67f73788a0ec4c5769b5b9e27f64d7951fb20c3))
* **471-02:** wire AdapterPool for ripple chain and add unit tests ([8d304fc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d304fc0a42658dab17b5e09f1d1284a8ab5be4b))
* **472-01:** implement getTokenInfo, getAssets Trust Lines, and tx-parser IOU precision ([e79678a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e79678a91b32cdb44101e64657b1890963d16db2))
* **472-01:** implement Trust Line currency utils, TrustSet, and IOU transfer ([b3b2fc5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3b2fc50a886e0e43965b2ed45fc5677871e9066))
* **473-01:** add ripple support to getNativeTokenInfo and NFT indexer ([2a685ed](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a685ede8d45ebeceb4a1d6d246b6b14f9d90a6a))
* **473-01:** implement XLS-20 NFT adapter and core schema extension ([b30e07b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b30e07bba43b28f2a8f3089dc09c0aafdcb42b11))
* **473-02:** add Ripple chain support to Admin UI wallet creation and RPC settings ([3fdd7bd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fdd7bd145ebe06dcf60a23e53a9de00b09b7747))
* **473-02:** extend OpenAPI and SDK chain enums with ripple ([916adc4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/916adc41d2a7df4cba070ee4ac2d1864b9a04d35))
* add debug logging to Action Provider API clients ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([9d71a26](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d71a264941d468c141a0a9103b3885db7723a8d))
* add debug logging to all Action Provider API clients and SDK wrappers ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([aa31bfd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aa31bfd22d0cbe8df6e855d3f569632fbfdc834c))
* **daemon,admin:** add test sign request for wallet apps ([#450](https://github.com/minhoyoo-iotrust/WAIaaS/issues/450)) ([d46e79e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d46e79e856e5e3db5bc7cbb3e4ace71e7f187020))
* **daemon,push-relay:** fix [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, fix [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) static_fields wiring ([521b7ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/521b7ac6eb0ac4908efdecaf9d95fefeb0143f55))
* integrate Dev.to blog posts into waiaas.ai/blog ([f9e74bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9e74bb79a0e34885816ab091c89701f578f6c56))
* **push-relay:** enhance debug logging for push payloads and sign responses ([#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458)) ([745fcee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/745fcee239c744ee7202ac8b541a0007fca8d26a))
* **settings:** enable XRPL DEX provider by default ([a3c7f86](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a3c7f86444fdb3ebf4cc162af3e8e976980d9ddd))
* XRP Ledger mainnet support (v33.6) ([79fc0c4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79fc0c47b418a32157d4c525d71546da9dd0dc47))


### Bug Fixes

* **adapter-ripple:** fix typecheck error in test mock casts ([b294075](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b2940758389e10f29f6e369e6621ac87802995a6))
* **adapter-ripple:** remove unused variable declarations in test file ([18f4b25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18f4b25ab7df3ca1a1c21f3f281bb313eb09497f))
* **adapter-ripple:** use default import for xrpl CJS module to fix ESM named export failure ([#481](https://github.com/minhoyoo-iotrust/WAIaaS/issues/481)) ([e7fbc18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7fbc18a545d9407a3fb488d16294aef8a259c16))
* add eslint-disable for [@ts-ignore](https://github.com/ts-ignore) on optional SDK imports ([0fbd32b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fbd32b4cd9b1bc819e0733403e8d4bc3fa2d08a))
* add missing type field to tauri.conf.json extra-file in release-please config ([590d0dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/590d0dc6a384ed6e61ee2fe7f9dcf48661e1293e))
* add non-null assertions to dcent-debug-dumper test for strict typecheck ([1ded5c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ded5c65a61d094ae007a4d664b959f67cec5954))
* add subscription staggering and ILogger injection for IncomingTxMonitor ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429), [#430](https://github.com/minhoyoo-iotrust/WAIaaS/issues/430)) ([f129a3c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f129a3c76a149f07f9dea58f699f76ec6989dcd5))
* **admin,push-relay:** resolve issues 432-436 ([1ba3cb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ba3cb8fb36f3f1582f70aba0ad05e67255000d7))
* **admin,push-relay:** resolve issues 432-436 ([0280d2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0280d2e409c616f042eeb3d30e07b2ed16439a07))
* **ci:** add required sections to xrpl-dex UAT scenario ([831367c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/831367c46a756eb49696c44852257dd1b63edf2d))
* **ci:** add workspace build step to desktop release pipeline ([#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471)) ([689a974](https://github.com/minhoyoo-iotrust/WAIaaS/commit/689a974040550470c842cb9d59177a9f79527b84))
* **ci:** add xrpl-dex to E2E provider coverage map ([08e0b6a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/08e0b6ad16d1548d747f2fecba2e79488dca4026))
* **ci:** disable Windows desktop build, restore release-please version sync ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([a8d5a02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a8d5a02662897b77d0ad1b60d9265cafc46c813a))
* **ci:** exclude desktop-v tags from RC auto-detection in promote workflow ([7167eef](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7167eef8fdfa2b6dd0c7a64ea23b8f470e4fa921))
* **ci:** fix release pipeline startup_failure ([a43930b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a43930b0e4aae6a6ff552938d8a3182fd4805a15))
* **ci:** install desktop deps separately and use npx --prefix ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([91c6519](https://github.com/minhoyoo-iotrust/WAIaaS/commit/91c6519e8a42c5f4ac2c29854bcb83b8ec594000))
* **ci:** mark desktop RC releases as prerelease on GitHub ([20eab21](https://github.com/minhoyoo-iotrust/WAIaaS/commit/20eab2192241cb2648d9247824b8665a494e56cd))
* **ci:** mark desktop RC releases as prerelease on GitHub ([#476](https://github.com/minhoyoo-iotrust/WAIaaS/issues/476)) ([535c70f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/535c70f9ad519ab2275b76e51a90c765fd73b581))
* **ci:** merge approval-gate into deploy job to eliminate double approval ([#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470)) ([9a8a2f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9a8a2f5a5fe402f236b51b44366cb48b82cce14d))
* **ci:** read version from package.json instead of GitHub Releases API ([#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457)) ([b73449e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b73449ea92fdc7a795996752395b0fb49d7f1e1d))
* **ci:** register xrpl-dex scenario defi-17 in UAT index ([83359b6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83359b61861a997793849e9aacfefa58e1c4dd92))
* **ci:** remove misplaced cross-package test from actions package ([0a382cd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a382cd04197c6c3c124e96421023cca378760f7))
* **ci:** remove tauriScript to let tauri-action install CLI itself ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([ce9c2d9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce9c2d9c12cd5cd41503ea10e8ee234a96d439f7))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([b07cc20](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b07cc209050b6deaae862a2301198594fced7937))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([616eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/616eec96d10ede61d9bcebcbd47e1a933d08a910))
* **ci:** restore environment: production on deploy job for npm OIDC auth ([75c4dc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75c4dc10a38822d12b6fa22556ae06aee361fc86))
* **ci:** scope desktop build to daemon/CLI packages only ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b94bb37](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b94bb376e7f0baa48028a3f9a4be7480d9d8f95a))
* **ci:** update enum SSoT expected counts for ripple chain ([d1ccce6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1ccce6002aa2f6b5fc26a6248553fe423a84816))
* **ci:** update enum SSoT expected counts for xrpl_dex settings ([79e433c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79e433cd632c75beb88d3077d1b016c9e7154c69))
* **ci:** use correct package name @waiaas/desktop in turbo filter ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([03bfcd6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03bfcd65f805a029adaf981ae0d52ff6c8175781))
* **ci:** use npx tauri instead of pnpm tauri for CLI resolution ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([5cf1804](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cf18049f43df023f220e5432864ed77e4ecee90))
* **ci:** use pnpm --filter instead of turbo --filter for desktop build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([1f17747](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f17747f7b5fead2ca527d5670918f49cd47e7d7))
* **ci:** use RELEASE_PAT for release-please auto-merge and add synchronize trigger ([0a7706f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a7706f5864bbbfdde153fbefeeca9ccdf5cb139))
* **ci:** use turbo --filter=@waiaas/cli... for scoped SEA build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([33cf737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/33cf73750d2fece181fa217552f6bb06293a51a8))
* concise error messages for viem errors + register issue [#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431) ([b9cd4cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b9cd4ccd08b14be58adb2ec375de0a862263e30c))
* correct DexSwapTxParams field names in debug dumper tests ([e3b165c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e3b165c5055af84ce8b52badd9560513ca7bca95))
* **daemon,admin,push-relay:** resolve issues 451-452 — sign request push body and toast args ([e24940c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e24940c1b23720ce3899c3322ccb7a07513b8043))
* **daemon,admin:** resolve issues 437-442 ([81e7405](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81e7405a4da1685476675ba9cec1d1c5332ec7ff))
* **daemon,wallet-sdk:** add owner address to test sign request ([#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)) and remove ntfy remnants ([#463](https://github.com/minhoyoo-iotrust/WAIaaS/issues/463)) ([81092e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81092e71bc3df8df792fdc8c7314b9fd52128816))
* **daemon:** add missing ripple-keypairs dependency for XRP wallet creation ([b4f42c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4f42c8e4d6b81e0a715dd1347b01e08ffaf6333))
* **daemon:** extract buildSignRequestPushPayload helper to fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) base64 format bug ([7788c66](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7788c669d6d936df5b56c0d49b00aeae5a7dcba6))
* **daemon:** fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) admin test sign request base64 format bug ([1981a78](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1981a78f21ad0f9bc2050f1c962685515afa7e11))
* **daemon:** promote startup step logs from debug to info level ([75d5ec8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75d5ec8a4f8299b1974643583f39d7d60cb5db09))
* **daemon:** remove OpenAPI body schema from test-sign-request to allow empty body ([d8e63d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8e63d1545a40afe9bf8f0704b4b2f2828c1ee80))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([290fed4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/290fed49d0ddbbc94e90213ac2c4a820bcbd3719))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([d6c462c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6c462cc613ce9cf1fed6667e7c57b48d0bb0973))
* **daemon:** resolve issue 449 — use subscription_token for Push Relay routing ([42ebfb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42ebfb84174c79c832a00079eb95f7771216ec80))
* **daemon:** resolve issues 443-444 — approval timeout policy passthrough and hot-reload ([441a431](https://github.com/minhoyoo-iotrust/WAIaaS/commit/441a431615660fd8112e0972353e021bd816464d))
* **daemon:** resolve issues 446-448 — DELAY cancel keyboard and TX_QUEUED notification enrichment ([c1e97ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1e97ba3a0c00c403ee613b04e5fd3e024d73281))
* **daemon:** send flat SignRequest fields in Push Relay payload ([#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456)) ([8c1d0e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c1d0e528f2cee93121874dd64584ac36e5b06a7))
* DB migration column order, MCP race condition, desktop dev mode ([32e3ebb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32e3ebb8106ddc827c329d2544135c9f5b95bc1a))
* **db:** rebuild wallets table in v60 migration to update CHECK constraint ([7d933f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d933f414502eef8c4c15f53ba5ac667dc9e9b8c))
* **db:** use explicit column lists in v62 migration to fix column order mismatch ([#480](https://github.com/minhoyoo-iotrust/WAIaaS/issues/480)) ([8d3b499](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d3b4994a4fdf753558c6f70b65a5cd3538271a0))
* defer PositionTracker sync and increase stagger delay ([#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431)) ([ca8613d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca8613d6935661873ae8ffe6f9bcba8a55b780b6))
* desktop build pipeline — issues [#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472) [#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473) [#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474) ([f399203](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f39920318c4e4480d6bd1530c5dabe9a01ec7a59))
* **desktop:** add beforeDevCommand and redesign tray icons ([1232089](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12320899d3829ff9d1fb69f00fe2a16ef6e4a584))
* **desktop:** add icon.ico/icon.icns and remove Apple signing env ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([3fe9779](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fe9779a5f372be0dc45e5638415fb2b224cc487))
* **desktop:** add legacy Solana deps to esbuild external list ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([7705b2f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7705b2fe8b61a81b13e99f5a8b623dde4a46f626))
* **desktop:** add remaining Solana transitive deps to esbuild external ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b46972e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b46972e4c3853fc94df67096037f79dbe9be2081))
* **desktop:** decouple desktop version from release-please ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([950e8c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/950e8c66382eee16bad40c1e0dab818a7f42acdb))
* **desktop:** replace placeholder icons with favicon-based icon set ([#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474)) ([d0980c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0980c3ff14429f92841b17e367a9ec13df70292))
* **desktop:** set Ed25519 updater public key in tauri.conf.json ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([8bfc4bf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8bfc4bffb5ab8a5f596b84678c8c943ee8b9330d))
* **desktop:** update Windows API calls for windows crate v0.58 ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([2759796](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2759796ec182500079fb339c81cab565e352cd4a))
* **desktop:** use fixed port 3100 instead of dynamic port 0 ([#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473)) ([46dd1b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46dd1b2b0317954e0769ddb3573f1137eee649d8))
* extract concise one-line error messages from viem errors ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429)) ([1aed766](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1aed7662ddeab8b466b14f0648f1985f5ac28097))
* IncomingTxMonitor startup stability and auto-merge CI ([596805b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/596805bbfcf3c0b81f9a4232c7c8ba52b2d96955))
* **lint:** rename unused catch variables to _err in RippleAdapter ([a51a92a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a51a92a5a2558f94d64fe254733b4febcef4e936))
* **mcp:** await registerActionProviderTools before server.connect ([#479](https://github.com/minhoyoo-iotrust/WAIaaS/issues/479)) ([4d1d822](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d1d822accd9bc939f89842db31e7d5c8c701917))
* **mcp:** extract PKG_VERSION to version.ts to avoid ESM circular import ([8ab3f9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ab3f9f87b7265b272d5d474655bfd6eae4bde90))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([07a41f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07a41f295e3592185beb278f051468a3f25817ad))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([cffc072](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cffc072b209313ab5ff62f719df0ae3953964cc6))
* pass rpcUrl to Jito provider via registerBuiltInProviders and fix fetch mock reuse ([6b904fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6b904fd2b9ec088ff3ba292f278d063501653429))
* pass rpcUrl to Kamino/Drift SDK, accept Pendle array response, and auto-resolve DCent decimals ([0120f1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0120f1baf666e753083428e7b6157505a1a57d4c))
* promote v2.11.0-rc.27 to stable 2.11.0 ([67a3828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/67a3828de6c863a167d34456cc197b6c1387de0a))
* promote v2.12.0-rc.16 to stable 2.12.0 ([95b33a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95b33a06e8b3e2be9fd161ae8005dff26db76dd4))
* promote v2.13.0-rc.8 to stable 2.13.0 ([ab194d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ab194d26cf941b4ffa8db7a40f7c34ef64523ca2))
* remove build script from desktop-spike to unblock CI ([bf21754](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf21754a1847745a29aeec1827092076bd37e9a9))
* remove unused testBytes variable in dcent-dex-swap test ([8d8232c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d8232c76377dbfccc947c4b7444b6c25b8f5fa5))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([dc15212](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dc15212298a8bafa4dfbc76181cae997ce98a207))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([10313e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10313e0accde7ba3ca495fe451364fe67e5be21c))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([2af859e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af859eb35c7233a98a77210a34aa578fbe4cded))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([8a567e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8a567e5371fc6b350987ede1944e6581c4d7957d))
* resolve issue [#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — Drift SDK authority + uninitialized user handling ([466210a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/466210aa966f8db5de25f150c44c7df5131dd6f2))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi position tracking, token registry, DCent Swap ([fe09ade](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe09ade08fe61dcd0df29e29442afb37f1668866))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi positions, token registry, DCent Swap ([96d0003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96d00038fb6d2023b212122b448df8e37247341b))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi providers, positions, UAT scenarios ([c6c2767](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6c2767b786c08eb8789a58af0df336f78384254))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi UAT, Jupiter ALT, Jito accounts, Pendle schema, SDK install, Aave decimals, PositionTracker sync ([c202e4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c202e4eacb9f205871621d93bd4d663b47ea59e9))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 ([e314a74](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e314a74e5a1056e3560ba3c368eaa59442742ae7))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 — daemon log level, DeFi UAT fixes, RPC hint ([2d62a13](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d62a13c998a2caa913016a082ac0f853c9e22dd))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#427](https://github.com/minhoyoo-iotrust/WAIaaS/issues/427) — nightly CI, RPC pool seeding, Drift SDK compat, DCent swap fixes ([4210b24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4210b2420405e84f19b7e8eacf9897c190f95f9c))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — DeFi UAT fixes, RPC pool seeding, DCent swap corrections ([885531d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/885531db15e06d379d0843280a401945379e96d6))
* resolve issues [#469](https://github.com/minhoyoo-iotrust/WAIaaS/issues/469) [#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470) [#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471) ([1547af0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1547af0c7d1cc84cc1c1d312f2b885eee2c6da3a))
* resolve Kamino/Drift RPC URL, Pendle schema regression, and DCent decimals auto-resolution ([e2e9da3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e2e9da398eece343d23121b223eeb6e82345de92))
* resolve open issues [#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456), [#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457), [#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458) ([ff0d22c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff0d22c757eb6707b264195e642352dd125bff16))
* resolve open issues [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) push relay static_fields ([ae308fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae308fb3383eeee52e58235918baf791cfa4be22))
* resolve open issues [#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)-[#464](https://github.com/minhoyoo-iotrust/WAIaaS/issues/464) — owner address, ntfy cleanup, docs update ([825f4aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/825f4aa6f9dd0d48f9bee754e5b79877b35b86b5))
* resolve open issues 437-452 ([c6cb6d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6cb6d7b45ee64dd9ed18917d246423c9cb824bb))
* resolve TS18048 in action-api-client test mock type ([0a87ea4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a87ea4b1ecc1a78420f207f6404c8bce932362d))
* **security:** update openclaw for GHSA-f6pf-4gjx-c94r ([762bbd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/762bbd4b66be8e0693a124e5657c546703b1f7ac))
* **security:** update openclaw to &gt;=2026.3.28 for GHSA-f6pf-4gjx-c94r ([f30d660](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f30d660d85fbf19140be205863b37a96311d0100))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([3848624](https://github.com/minhoyoo-iotrust/WAIaaS/commit/384862499a0eb9a3f399501eb0a6202bf30088d5))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([#465](https://github.com/minhoyoo-iotrust/WAIaaS/issues/465), [#466](https://github.com/minhoyoo-iotrust/WAIaaS/issues/466), [#467](https://github.com/minhoyoo-iotrust/WAIaaS/issues/467)) ([038ee36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/038ee36ca0772382b68b7bc7926a4e554737b194))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([f2275dd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f2275dd2a3019b617bd2c2a5ba2f52eee22e1ded))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([888c902](https://github.com/minhoyoo-iotrust/WAIaaS/commit/888c902ba176a01b322c8e400e5c4f0790380b44))
* **site:** add state=all to Dev.to API query to include all published posts ([88930f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88930f0fdd196d00f43508e401a9220fb4676e06))
* **site:** bypass Dev.to CDN cache with API key authentication ([9fc4bab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fc4babdb2ed94433e288e1eab7c8e2507afee69))
* **site:** pass API key to individual Dev.to article fetches ([a6675ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6675ee2d968e5a5c5a5cba9fae2078970903add))
* **site:** replace Korean fallback text with English on download page ([4f4a8ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f4a8eec3eaab091268a1bcbcba39a0e57d294ab))
* **solana:** resolve eslint no-this-alias and no-unsafe-function-type errors ([187be72](https://github.com/minhoyoo-iotrust/WAIaaS/commit/187be727efcfd14ab3456c920a9da0cc3549806d))
* **solana:** resolve require-yield lint errors in test async iterables ([54fc046](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54fc0469b248e907dbcb525649e89f4902f616ec))
* update pnpm-lock.yaml for Tauri desktop dependencies ([f3b5c94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3b5c94e703556c83b6c89ef53e6e76810209d55))
* use [@ts-ignore](https://github.com/ts-ignore) for optional SDK imports to support CI without optional deps ([c9a5dd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9a5dd440f0972142bbc98f7df5cabaf91da2e2c))
* **wallet-sdk:** simplify decodeInlineData to restore 100% coverage ([7780a24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7780a24cd07c6be65f611a92542cdfbed7360142))
* XRPL stabilization — ripple-keypairs dep, ESM import fix, DEX default enable ([32efa47](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32efa479b94ecf5b0fd35b0ee00f02fc0f9f3741))
* **xrpl:** resolve 3 critical XRPL bugs and add token registry support ([4e881c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e881c8ba67a30a1faca97b6ba6973ae3df13a39))
* **xrpl:** resolve 3 critical XRPL bugs and add token registry support ([fc65b22](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc65b222f22e0e170411d0ebade0b81661052bab))

## [2.14.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0...v2.14.0-rc) (2026-04-06)


### Features

* **01-01:** extend buildContractCall() with OfferCreate/OfferCancel routing ([135ed5e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/135ed5eeba083d0095b938d4f26f80994caa45c0))
* **01-02:** add OfferCreate/OfferCancel CONTRACT_CALL parsing to tx-parser ([1d67639](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d676390108848bb8fec46eb0ea77e5fa27debd6))
* **02-01:** add OfferBuilder with currency amount conversion and reserve validation ([b75b003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b75b0030a17440e2f67f93e1ae3c8bcdbab9a236))
* **02-01:** add XrplOrderbookClient RPC wrapper for orderbook queries ([b334932](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b334932c382f1cbbbefd5142a756aa213f2ac8f4))
* **02-01:** add Zod input schemas for 5 XRPL DEX actions ([bf58b9e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf58b9ed8ee55dfd9fa8600d8231983c8ab41544))
* **02-02:** extend buildContractCall for TrustSet + register XrplDexProvider ([d1b37ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1b37ac8ec59e0dab72ab4b82c3de03e468137a5))
* **02-02:** implement XrplDexProvider with 5 actions ([0448d7b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0448d7b07bca0b60b71837bc10fbdea2b4e83a5f))
* **02-03:** register xrpl_dex in builtin-metadata and setting keys ([2b77125](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2b7712563aa2e3208fc467406dc2469d921f7c8f))
* **03-01:** resolveEffectiveAmountUsd XRPL DEX calldata parsing ([92f86d8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92f86d83eaaad253206e219557092a98833d45a8))
* **03-02:** Admin UI transaction type labels + XRPL DEX display ([b360587](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3605879f87aa0da00b22c96cf7289dddce4543f))
* **470-01:** extend core chain enums, constants, and RPC defaults for ripple ([e33e08b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e33e08b4766a7a201120350e7461063a3db34637))
* **470-01:** register ripple ChainType and XRPL NetworkTypes in shared SSoT ([9374c44](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9374c44f5dfa93625c5a624a403f0ea9ae25e198))
* **470-02:** register XRPL CAIP-2 chain IDs and CAIP-19 asset identifiers ([d7329e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d7329e54f348a4aedaaa6bf6cfbe701012c16c30))
* **470-03:** add ripple chain stub to AdapterPool with RPC config key mapping ([ccd91f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ccd91f4ea1d6ab75b1aaf5a1368b8789d2b35a65))
* **470-03:** DB v62 migration -- add ripple chain and XRPL networks to CHECK constraints ([8963385](https://github.com/minhoyoo-iotrust/WAIaaS/commit/89633857592826275f2fbb6bb73613dc49e5d7af))
* **471-01:** scaffold @waiaas/adapter-ripple package with RippleAdapter, KeyStore ripple support, and XRPL RPC config ([e67f737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e67f73788a0ec4c5769b5b9e27f64d7951fb20c3))
* **471-02:** wire AdapterPool for ripple chain and add unit tests ([8d304fc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d304fc0a42658dab17b5e09f1d1284a8ab5be4b))
* **472-01:** implement getTokenInfo, getAssets Trust Lines, and tx-parser IOU precision ([e79678a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e79678a91b32cdb44101e64657b1890963d16db2))
* **472-01:** implement Trust Line currency utils, TrustSet, and IOU transfer ([b3b2fc5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3b2fc50a886e0e43965b2ed45fc5677871e9066))
* **473-01:** add ripple support to getNativeTokenInfo and NFT indexer ([2a685ed](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a685ede8d45ebeceb4a1d6d246b6b14f9d90a6a))
* **473-01:** implement XLS-20 NFT adapter and core schema extension ([b30e07b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b30e07bba43b28f2a8f3089dc09c0aafdcb42b11))
* **473-02:** add Ripple chain support to Admin UI wallet creation and RPC settings ([3fdd7bd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fdd7bd145ebe06dcf60a23e53a9de00b09b7747))
* **473-02:** extend OpenAPI and SDK chain enums with ripple ([916adc4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/916adc41d2a7df4cba070ee4ac2d1864b9a04d35))
* **settings:** enable XRPL DEX provider by default ([a3c7f86](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a3c7f86444fdb3ebf4cc162af3e8e976980d9ddd))
* XRP Ledger mainnet support (v33.6) ([79fc0c4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79fc0c47b418a32157d4c525d71546da9dd0dc47))


### Bug Fixes

* **adapter-ripple:** fix typecheck error in test mock casts ([b294075](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b2940758389e10f29f6e369e6621ac87802995a6))
* **adapter-ripple:** remove unused variable declarations in test file ([18f4b25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18f4b25ab7df3ca1a1c21f3f281bb313eb09497f))
* **adapter-ripple:** use default import for xrpl CJS module to fix ESM named export failure ([#481](https://github.com/minhoyoo-iotrust/WAIaaS/issues/481)) ([e7fbc18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7fbc18a545d9407a3fb488d16294aef8a259c16))
* **ci:** add required sections to xrpl-dex UAT scenario ([831367c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/831367c46a756eb49696c44852257dd1b63edf2d))
* **ci:** add xrpl-dex to E2E provider coverage map ([08e0b6a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/08e0b6ad16d1548d747f2fecba2e79488dca4026))
* **ci:** register xrpl-dex scenario defi-17 in UAT index ([83359b6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83359b61861a997793849e9aacfefa58e1c4dd92))
* **ci:** remove misplaced cross-package test from actions package ([0a382cd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a382cd04197c6c3c124e96421023cca378760f7))
* **ci:** update enum SSoT expected counts for ripple chain ([d1ccce6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1ccce6002aa2f6b5fc26a6248553fe423a84816))
* **ci:** update enum SSoT expected counts for xrpl_dex settings ([79e433c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79e433cd632c75beb88d3077d1b016c9e7154c69))
* **daemon:** add missing ripple-keypairs dependency for XRP wallet creation ([b4f42c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4f42c8e4d6b81e0a715dd1347b01e08ffaf6333))
* DB migration column order, MCP race condition, desktop dev mode ([32e3ebb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32e3ebb8106ddc827c329d2544135c9f5b95bc1a))
* **db:** use explicit column lists in v62 migration to fix column order mismatch ([#480](https://github.com/minhoyoo-iotrust/WAIaaS/issues/480)) ([8d3b499](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d3b4994a4fdf753558c6f70b65a5cd3538271a0))
* **desktop:** add beforeDevCommand and redesign tray icons ([1232089](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12320899d3829ff9d1fb69f00fe2a16ef6e4a584))
* **lint:** rename unused catch variables to _err in RippleAdapter ([a51a92a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a51a92a5a2558f94d64fe254733b4febcef4e936))
* **mcp:** await registerActionProviderTools before server.connect ([#479](https://github.com/minhoyoo-iotrust/WAIaaS/issues/479)) ([4d1d822](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d1d822accd9bc939f89842db31e7d5c8c701917))
* **security:** update openclaw for GHSA-f6pf-4gjx-c94r ([762bbd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/762bbd4b66be8e0693a124e5657c546703b1f7ac))
* **security:** update openclaw to &gt;=2026.3.28 for GHSA-f6pf-4gjx-c94r ([f30d660](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f30d660d85fbf19140be205863b37a96311d0100))
* XRPL stabilization — ripple-keypairs dep, ESM import fix, DEX default enable ([32efa47](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32efa479b94ecf5b0fd35b0ee00f02fc0f9f3741))
* **xrpl:** resolve 3 critical XRPL bugs and add token registry support ([4e881c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e881c8ba67a30a1faca97b6ba6973ae3df13a39))
* **xrpl:** resolve 3 critical XRPL bugs and add token registry support ([fc65b22](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc65b222f22e0e170411d0ebade0b81661052bab))

## [2.13.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0...v2.13.0) (2026-04-02)


### Features

* **443-01:** add 3 SEO landing pages for AI wallet category keywords ([a87c64b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a87c64bc9a62fe45e4c1ee27b8efde8e63635b90))
* **449-01:** replace ntfy with push_relay in core schemas ([b396882](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b396882eee0c9b0367b6f1983234d9cb2e208e5d))
* **449-01:** update sign-request-builder to push_relay + fix schema-ddl CHECK ([cfdf198](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cfdf198ac691e7d63da2e1abcb554ac2cf4ad0ef))
* **449-02:** add DB v60 migration for push_relay_url + ntfy cleanup ([5d081e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d081e63392f29e84b9feca4df50f97c00e1c6ac))
* **449-03:** add sign_responses DB store + rewrite sign-response-routes ([8815ccb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8815ccb1b6ef625c3f52624001613ca3d6c15624))
* **449-03:** remove ntfy code from push-relay, add direct push API ([ff16b1f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff16b1ff4741f404abe5ffbf653f4942725fa092))
* **450-01:** replace NtfySigningChannel with PushRelaySigningChannel ([47a35ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/47a35adb5ebd39389608b245b855b85bbfe4a91b))
* **450-01:** update ApprovalChannelRouter and daemon startup for sdk_push ([8ddebcc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ddebcc55cd776d771c62e4d7822d7195af48749))
* **450-02:** rewrite WalletNotificationChannel to use Push Relay HTTP POST ([34bef0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34bef0dc308ade802abeadbe1110a781dbb5cbb1))
* **451-01:** add push_relay_url to WalletApp API and fix notification channel ([095eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/095eec91b86e505aeead960818923ae563c16189))
* **451-01:** deprecate SDK ntfy channel functions ([2af5fb4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af5fb4ca5d08dde97533f26b92bab8ee4bc7883))
* **451-02:** update Admin UI human-wallet-apps from ntfy to Push Relay ([03e1fec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03e1fec05285be7f7d3cace316c7794349d5405f))
* **451-02:** update wallets.tsx approval method labels from ntfy to Push ([77e9f0b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/77e9f0b96a9d54539abc948c8b0f263fd79cd0df))
* **453-02:** remove admin/setup skills and update registry/installer ([921a8d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/921a8d4c1d94ca49f08c8d2e9af6f5d85e981fa5))
* **453-02:** remove masterAuth content from all skill files ([97d4ec4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/97d4ec44358a2b3c732ea72503660ee063fc4fda))
* **454-01:** scaffold @waiaas/openclaw-plugin package ([18beaf8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18beaf8b478edd0613f7fafee4823b82fd7964c2))
* **454-02:** implement 17 sessionAuth tools for OpenClaw plugin ([83f0d75](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83f0d75582dd532d07f9b03a7115909ffdf7a741))
* **455-01:** integrate openclaw-plugin into release and publish pipelines ([75860e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75860e4d298d3272cfd1aa4b57f791eccb113143))
* **455-02:** rewrite openclaw-integration.md + add openclaw-plugin SEO page + rebuild site ([b26d493](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b26d49303f9435e4220b3c02011cc353ea546a12))
* **459-01:** create Tauri spike project with @reown/appkit integration ([a924e7a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a924e7a8f8d77cb305a61e9acb5320ba0b35362a))
* **460-01:** Tauri 2 project scaffolding + SidecarManager implementation ([8fb9b4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8fb9b4e43ec5cccaf11e1378ecfe44da887cc412))
* **460-02:** SEA binary build pipeline + native-loader + dynamic port output ([6c4e8ca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c4e8ca9ea8e7a14a1d269080365e1ff2ca809e3))
* **460-03:** splash -&gt; daemon start -&gt; WebView navigate integration ([85b4173](https://github.com/minhoyoo-iotrust/WAIaaS/commit/85b41734d91456f3ffc576570051a53ab31391a3))
* **461-01:** add 4-layer tree-shaking config and CI bundle verification ([2aae71b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2aae71beca2c8828d15d4cf1e3a010c2f4062a41))
* **461-01:** add quit_app IPC command, isDesktop() detection, and TS bridge wrappers ([24b43f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24b43f1ff62151fbdadc27960da5b50f5aa9b4cb))
* **461-02:** add system tray module with 3-color icons, context menu, and 30s health polling ([43412e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43412e745444295e2bf2fb6b04aea86f6c259ade))
* **461-02:** integrate system tray in main.rs with tray-icon and image-png features ([00b1116](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00b11161895e5cb9072a4c709e6d671b47377c65))
* **462-01:** Setup Wizard orchestrator + App.tsx dynamic import integration ([7c19769](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c19769b19cf9cd6681f232c7e5f7d0c30358880))
* **462-01:** wizard store + 5 step components for Desktop Setup Wizard ([b4b89af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4b89afefb1e834eef8ed0ac401c0e3955e56fff))
* **462-02:** WalletConnect QR connector + modal via daemon REST API (Plan B) ([7153984](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7153984cb4a7aa5eba7181e98c7b7dcd73853994))
* **462-03:** wire Owner step to WalletConnect QR modal via dynamic imports ([5cb0c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cb0c992201c2b8d7a096f265405e4799b4a8359))
* **463-01:** integrate Tauri updater plugin with Ed25519 signing config ([17ce11b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17ce11be358bcfee3b53a7e62bdd52837ce03fb4))
* **463-02:** add 3-platform desktop release CI workflow ([bff990d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bff990d7c66ba0555d114ccefb6d7de22419d1a9))
* **463-03:** add auto-update UI with UpdateBanner and update-checker ([3348fa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3348fa3d6541ea159e5b3c23525fedc246bb6cb5))
* **465-01:** add download page with OS detection and GitHub API integration ([14c6373](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14c63733ce852ac03412d0f78ab74e242462ab9b))
* **466-01:** add Desktop App distribution channels to SUBMISSION_KIT ([48ef4ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/48ef4ad6c4020aef9b1ff12cd1d260ebd47f61cd))
* **466-01:** add Download link to site navigation and sitemap ([d8b8efd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8b8efdc2e1d9ffdcfdf7871bcbae7e5ccc96354))
* add debug logging to Action Provider API clients ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([9d71a26](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d71a264941d468c141a0a9103b3885db7723a8d))
* add debug logging to all Action Provider API clients and SDK wrappers ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([aa31bfd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aa31bfd22d0cbe8df6e855d3f569632fbfdc834c))
* add DeFi position exit and DCent Swap extended UAT scenarios ([016b160](https://github.com/minhoyoo-iotrust/WAIaaS/commit/016b160e273890f0d0a6130f17095aaea222e433))
* add Env column and --env filter to Agent UAT scenarios ([4c03900](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c03900fd9eea20cfae99f5f196305d92969d0e4))
* **daemon,admin:** add test sign request for wallet apps ([#450](https://github.com/minhoyoo-iotrust/WAIaaS/issues/450)) ([d46e79e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d46e79e856e5e3db5bc7cbb3e4ace71e7f187020))
* **daemon,push-relay:** fix [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, fix [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) static_fields wiring ([521b7ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/521b7ac6eb0ac4908efdecaf9d95fefeb0143f55))
* integrate Dev.to blog posts into waiaas.ai/blog ([f9e74bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9e74bb79a0e34885816ab091c89701f578f6c56))
* **push-relay:** enhance debug logging for push payloads and sign responses ([#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458)) ([745fcee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/745fcee239c744ee7202ac8b541a0007fca8d26a))


### Bug Fixes

* **450-01:** update remaining ntfy references in SDK tests and preset-auto-setup ([efae3ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/efae3ff1b1fe8d5317af6f0c5bf37508e9ec55c9))
* add eslint-disable for [@ts-ignore](https://github.com/ts-ignore) on optional SDK imports ([0fbd32b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fbd32b4cd9b1bc819e0733403e8d4bc3fa2d08a))
* add GET /policies/:id route and fix unused import lint errors ([b28c5b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b28c5b5f47a98057365e87ea68fd07151d410eef))
* add missing type field to tauri.conf.json extra-file in release-please config ([590d0dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/590d0dc6a384ed6e61ee2fe7f9dcf48661e1293e))
* add non-null assertions to dcent-debug-dumper test for strict typecheck ([1ded5c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ded5c65a61d094ae007a4d664b959f67cec5954))
* add subscription staggering and ILogger injection for IncomingTxMonitor ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429), [#430](https://github.com/minhoyoo-iotrust/WAIaaS/issues/430)) ([f129a3c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f129a3c76a149f07f9dea58f699f76ec6989dcd5))
* **admin,push-relay:** resolve issues 432-436 ([1ba3cb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ba3cb8fb36f3f1582f70aba0ad05e67255000d7))
* **admin,push-relay:** resolve issues 432-436 ([0280d2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0280d2e409c616f042eeb3d30e07b2ed16439a07))
* align SDK test assertions with actual URL query values ([4a279b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4a279b4d1511fc2406224e21d05a431196d64861))
* **ci:** add workspace build step to desktop release pipeline ([#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471)) ([689a974](https://github.com/minhoyoo-iotrust/WAIaaS/commit/689a974040550470c842cb9d59177a9f79527b84))
* **ci:** disable Windows desktop build, restore release-please version sync ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([a8d5a02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a8d5a02662897b77d0ad1b60d9265cafc46c813a))
* **ci:** exclude desktop-v tags from RC auto-detection in promote workflow ([7167eef](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7167eef8fdfa2b6dd0c7a64ea23b8f470e4fa921))
* **ci:** fix release pipeline startup_failure ([a43930b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a43930b0e4aae6a6ff552938d8a3182fd4805a15))
* **ci:** install desktop deps separately and use npx --prefix ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([91c6519](https://github.com/minhoyoo-iotrust/WAIaaS/commit/91c6519e8a42c5f4ac2c29854bcb83b8ec594000))
* **ci:** mark desktop RC releases as prerelease on GitHub ([20eab21](https://github.com/minhoyoo-iotrust/WAIaaS/commit/20eab2192241cb2648d9247824b8665a494e56cd))
* **ci:** mark desktop RC releases as prerelease on GitHub ([#476](https://github.com/minhoyoo-iotrust/WAIaaS/issues/476)) ([535c70f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/535c70f9ad519ab2275b76e51a90c765fd73b581))
* **ci:** merge approval-gate into deploy job to eliminate double approval ([#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470)) ([9a8a2f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9a8a2f5a5fe402f236b51b44366cb48b82cce14d))
* **ci:** read version from package.json instead of GitHub Releases API ([#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457)) ([b73449e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b73449ea92fdc7a795996752395b0fb49d7f1e1d))
* **ci:** remove tauriScript to let tauri-action install CLI itself ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([ce9c2d9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce9c2d9c12cd5cd41503ea10e8ee234a96d439f7))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([b07cc20](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b07cc209050b6deaae862a2301198594fced7937))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([616eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/616eec96d10ede61d9bcebcbd47e1a933d08a910))
* **ci:** restore environment: production on deploy job for npm OIDC auth ([75c4dc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75c4dc10a38822d12b6fa22556ae06aee361fc86))
* **ci:** scope desktop build to daemon/CLI packages only ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b94bb37](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b94bb376e7f0baa48028a3f9a4be7480d9d8f95a))
* **ci:** use correct package name @waiaas/desktop in turbo filter ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([03bfcd6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03bfcd65f805a029adaf981ae0d52ff6c8175781))
* **ci:** use npx tauri instead of pnpm tauri for CLI resolution ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([5cf1804](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cf18049f43df023f220e5432864ed77e4ecee90))
* **ci:** use pnpm --filter instead of turbo --filter for desktop build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([1f17747](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f17747f7b5fead2ca527d5670918f49cd47e7d7))
* **ci:** use RELEASE_PAT for release-please auto-merge and add synchronize trigger ([0a7706f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a7706f5864bbbfdde153fbefeeca9ccdf5cb139))
* **ci:** use turbo --filter=@waiaas/cli... for scoped SEA build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([33cf737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/33cf73750d2fece181fa217552f6bb06293a51a8))
* concise error messages for viem errors + register issue [#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431) ([b9cd4cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b9cd4ccd08b14be58adb2ec375de0a862263e30c))
* correct DCent Swap UAT scenario API endpoints and amounts ([2a53b47](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a53b47980ffea7959cb2c74b0b06317fdd5c2bc))
* correct DexSwapTxParams field names in debug dumper tests ([e3b165c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e3b165c5055af84ce8b52badd9560513ca7bca95))
* correct Lido testnet contract addresses from Holesky to Sepolia ([73ef0c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/73ef0c3432e018e82322b60dbe378bece158982e))
* **daemon,admin,push-relay:** resolve issues 451-452 — sign request push body and toast args ([e24940c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e24940c1b23720ce3899c3322ccb7a07513b8043))
* **daemon,admin:** resolve issues 437-442 ([81e7405](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81e7405a4da1685476675ba9cec1d1c5332ec7ff))
* **daemon,wallet-sdk:** add owner address to test sign request ([#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)) and remove ntfy remnants ([#463](https://github.com/minhoyoo-iotrust/WAIaaS/issues/463)) ([81092e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81092e71bc3df8df792fdc8c7314b9fd52128816))
* **daemon:** extract buildSignRequestPushPayload helper to fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) base64 format bug ([7788c66](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7788c669d6d936df5b56c0d49b00aeae5a7dcba6))
* **daemon:** fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) admin test sign request base64 format bug ([1981a78](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1981a78f21ad0f9bc2050f1c962685515afa7e11))
* **daemon:** promote startup step logs from debug to info level ([75d5ec8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75d5ec8a4f8299b1974643583f39d7d60cb5db09))
* **daemon:** remove OpenAPI body schema from test-sign-request to allow empty body ([d8e63d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8e63d1545a40afe9bf8f0704b4b2f2828c1ee80))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([290fed4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/290fed49d0ddbbc94e90213ac2c4a820bcbd3719))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([d6c462c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6c462cc613ce9cf1fed6667e7c57b48d0bb0973))
* **daemon:** resolve issue 449 — use subscription_token for Push Relay routing ([42ebfb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42ebfb84174c79c832a00079eb95f7771216ec80))
* **daemon:** resolve issues 443-444 — approval timeout policy passthrough and hot-reload ([441a431](https://github.com/minhoyoo-iotrust/WAIaaS/commit/441a431615660fd8112e0972353e021bd816464d))
* **daemon:** resolve issues 446-448 — DELAY cancel keyboard and TX_QUEUED notification enrichment ([c1e97ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1e97ba3a0c00c403ee613b04e5fd3e024d73281))
* **daemon:** send flat SignRequest fields in Push Relay payload ([#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456)) ([8c1d0e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c1d0e528f2cee93121874dd64584ac36e5b06a7))
* **db:** rebuild wallets table in v60 migration to update CHECK constraint ([7d933f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d933f414502eef8c4c15f53ba5ac667dc9e9b8c))
* defer PositionTracker sync and increase stagger delay ([#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431)) ([ca8613d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca8613d6935661873ae8ffe6f9bcba8a55b780b6))
* desktop build pipeline — issues [#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472) [#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473) [#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474) ([f399203](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f39920318c4e4480d6bd1530c5dabe9a01ec7a59))
* **desktop:** add icon.ico/icon.icns and remove Apple signing env ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([3fe9779](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fe9779a5f372be0dc45e5638415fb2b224cc487))
* **desktop:** add legacy Solana deps to esbuild external list ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([7705b2f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7705b2fe8b61a81b13e99f5a8b623dde4a46f626))
* **desktop:** add remaining Solana transitive deps to esbuild external ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b46972e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b46972e4c3853fc94df67096037f79dbe9be2081))
* **desktop:** decouple desktop version from release-please ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([950e8c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/950e8c66382eee16bad40c1e0dab818a7f42acdb))
* **desktop:** replace placeholder icons with favicon-based icon set ([#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474)) ([d0980c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0980c3ff14429f92841b17e367a9ec13df70292))
* **desktop:** set Ed25519 updater public key in tauri.conf.json ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([8bfc4bf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8bfc4bffb5ab8a5f596b84678c8c943ee8b9330d))
* **desktop:** update Windows API calls for windows crate v0.58 ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([2759796](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2759796ec182500079fb339c81cab565e352cd4a))
* **desktop:** use fixed port 3100 instead of dynamic port 0 ([#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473)) ([46dd1b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46dd1b2b0317954e0769ddb3573f1137eee649d8))
* extract concise one-line error messages from viem errors ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429)) ([1aed766](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1aed7662ddeab8b466b14f0648f1985f5ac28097))
* include error details in Telegram Bot retry warning logs ([99b1002](https://github.com/minhoyoo-iotrust/WAIaaS/commit/99b10026e45f9f7744b4e1465817414f9062ab67))
* IncomingTxMonitor startup stability and auto-merge CI ([596805b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/596805bbfcf3c0b81f9a4232c7c8ba52b2d96955))
* **mcp:** extract PKG_VERSION to version.ts to avoid ESM circular import ([8ab3f9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ab3f9f87b7265b272d5d474655bfd6eae4bde90))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([07a41f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07a41f295e3592185beb278f051468a3f25817ad))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([cffc072](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cffc072b209313ab5ff62f719df0ae3953964cc6))
* normalize EVM token addresses with EIP-55 checksum validation ([d0d7229](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0d72295f143a06be779f9c42d59fad8f63e60de)), closes [#379](https://github.com/minhoyoo-iotrust/WAIaaS/issues/379)
* pass rpcUrl to Jito provider via registerBuiltInProviders and fix fetch mock reuse ([6b904fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6b904fd2b9ec088ff3ba292f278d063501653429))
* pass rpcUrl to Kamino/Drift SDK, accept Pendle array response, and auto-resolve DCent decimals ([0120f1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0120f1baf666e753083428e7b6157505a1a57d4c))
* promote v2.11.0-rc.27 to stable 2.11.0 ([67a3828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/67a3828de6c863a167d34456cc197b6c1387de0a))
* promote v2.12.0-rc.16 to stable 2.12.0 ([95b33a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95b33a06e8b3e2be9fd161ae8005dff26db76dd4))
* promote v2.13.0-rc.8 to stable 2.13.0 ([ab194d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ab194d26cf941b4ffa8db7a40f7c34ef64523ca2))
* remove build script from desktop-spike to unblock CI ([bf21754](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf21754a1847745a29aeec1827092076bd37e9a9))
* remove duplicate H1 title on SEO pages ([ae3ba56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae3ba5659cb980ef4b1befb96ed9bc7a3d5c4b55))
* remove formatAmount() from DCent Swap API calls ([646366f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/646366fde152657bc5b553e191e9ecaca76ea165))
* remove ntfy channel status from admin-notifications API ([be542b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/be542b0de98bac461ec2e6c6fc3e5df35f5a174c))
* remove obsolete cancelTopicEdit test for removed feature ([6875180](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68751803a293c5c7f639f6d9f825233d4b7f31a4))
* remove stale ntfy references from tests and admin UI ([19529b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19529b73dc9a987c5f42af1b05af50dddc57910f))
* remove unused testBytes variable in dcent-dex-swap test ([8d8232c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d8232c76377dbfccc947c4b7444b6c25b8f5fa5))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([dc15212](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dc15212298a8bafa4dfbc76181cae997ce98a207))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([10313e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10313e0accde7ba3ca495fe451364fe67e5be21c))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([2af859e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af859eb35c7233a98a77210a34aa578fbe4cded))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([8a567e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8a567e5371fc6b350987ede1944e6581c4d7957d))
* resolve issue [#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — Drift SDK authority + uninitialized user handling ([466210a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/466210aa966f8db5de25f150c44c7df5131dd6f2))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi position tracking, token registry, DCent Swap ([fe09ade](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe09ade08fe61dcd0df29e29442afb37f1668866))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi positions, token registry, DCent Swap ([96d0003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96d00038fb6d2023b212122b448df8e37247341b))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi providers, positions, UAT scenarios ([c6c2767](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6c2767b786c08eb8789a58af0df336f78384254))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi UAT, Jupiter ALT, Jito accounts, Pendle schema, SDK install, Aave decimals, PositionTracker sync ([c202e4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c202e4eacb9f205871621d93bd4d663b47ea59e9))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 ([e314a74](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e314a74e5a1056e3560ba3c368eaa59442742ae7))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 — daemon log level, DeFi UAT fixes, RPC hint ([2d62a13](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d62a13c998a2caa913016a082ac0f853c9e22dd))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#427](https://github.com/minhoyoo-iotrust/WAIaaS/issues/427) — nightly CI, RPC pool seeding, Drift SDK compat, DCent swap fixes ([4210b24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4210b2420405e84f19b7e8eacf9897c190f95f9c))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — DeFi UAT fixes, RPC pool seeding, DCent swap corrections ([885531d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/885531db15e06d379d0843280a401945379e96d6))
* resolve issues [#469](https://github.com/minhoyoo-iotrust/WAIaaS/issues/469) [#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470) [#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471) ([1547af0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1547af0c7d1cc84cc1c1d312f2b885eee2c6da3a))
* resolve Kamino/Drift RPC URL, Pendle schema regression, and DCent decimals auto-resolution ([e2e9da3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e2e9da398eece343d23121b223eeb6e82345de92))
* resolve lint errors in push-relay-signing-channel and signing-sdk-e2e test ([9fbc3bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fbc3bb3ac49d333e300e36508e02d39cf93dd0d))
* resolve open issues [#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456), [#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457), [#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458) ([ff0d22c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff0d22c757eb6707b264195e642352dd125bff16))
* resolve open issues [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) push relay static_fields ([ae308fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae308fb3383eeee52e58235918baf791cfa4be22))
* resolve open issues [#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)-[#464](https://github.com/minhoyoo-iotrust/WAIaaS/issues/464) — owner address, ntfy cleanup, docs update ([825f4aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/825f4aa6f9dd0d48f9bee754e5b79877b35b86b5))
* resolve open issues 437-452 ([c6cb6d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6cb6d7b45ee64dd9ed18917d246423c9cb824bb))
* resolve PositionTracker RPC URLs via RpcPool for DeFi dashboard ([62539c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62539c79117af45c76f090d5a0954bdb3ced8aab)), closes [#380](https://github.com/minhoyoo-iotrust/WAIaaS/issues/380)
* resolve TS18048 in action-api-client test mock type ([0a87ea4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a87ea4b1ecc1a78420f207f6404c8bce932362d))
* resolve type errors in SDK client-coverage test ([7740848](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7740848448635b7875e11e03a7ed1ecb10560af2))
* resolve unused variable and empty block lint errors in CLI tests ([0b9c23c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0b9c23cedc89405f2de4fb7064d169dcfb1ed0fe))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([3848624](https://github.com/minhoyoo-iotrust/WAIaaS/commit/384862499a0eb9a3f399501eb0a6202bf30088d5))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([#465](https://github.com/minhoyoo-iotrust/WAIaaS/issues/465), [#466](https://github.com/minhoyoo-iotrust/WAIaaS/issues/466), [#467](https://github.com/minhoyoo-iotrust/WAIaaS/issues/467)) ([038ee36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/038ee36ca0772382b68b7bc7926a4e554737b194))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([f2275dd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f2275dd2a3019b617bd2c2a5ba2f52eee22e1ded))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([888c902](https://github.com/minhoyoo-iotrust/WAIaaS/commit/888c902ba176a01b322c8e400e5c4f0790380b44))
* **site:** add state=all to Dev.to API query to include all published posts ([88930f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88930f0fdd196d00f43508e401a9220fb4676e06))
* **site:** bypass Dev.to CDN cache with API key authentication ([9fc4bab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fc4babdb2ed94433e288e1eab7c8e2507afee69))
* **site:** pass API key to individual Dev.to article fetches ([a6675ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6675ee2d968e5a5c5a5cba9fae2078970903add))
* **site:** replace Korean fallback text with English on download page ([4f4a8ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f4a8eec3eaab091268a1bcbcba39a0e57d294ab))
* **solana:** resolve eslint no-this-alias and no-unsafe-function-type errors ([187be72](https://github.com/minhoyoo-iotrust/WAIaaS/commit/187be727efcfd14ab3456c920a9da0cc3549806d))
* **solana:** resolve require-yield lint errors in test async iterables ([54fc046](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54fc0469b248e907dbcb525649e89f4902f616ec))
* update pnpm-lock.yaml for Tauri desktop dependencies ([f3b5c94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3b5c94e703556c83b6c89ef53e6e76810209d55))
* use [@ts-ignore](https://github.com/ts-ignore) for optional SDK imports to support CI without optional deps ([c9a5dd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9a5dd440f0972142bbc98f7df5cabaf91da2e2c))
* **wallet-sdk:** simplify decodeInlineData to restore 100% coverage ([7780a24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7780a24cd07c6be65f611a92542cdfbed7360142))


### Code Refactoring

* **452-01:** rename docs/guides/ to docs/agent-guides/ ([e235d2b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e235d2b2fc332c72652852bb6eb02dd84c3dabcf))

## [2.13.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0...v2.13.0) (2026-04-02)


### Bug Fixes

* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([b07cc20](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b07cc209050b6deaae862a2301198594fced7937))
* **ci:** replace global npm upgrade with npx npm@11 in release workflow ([616eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/616eec96d10ede61d9bcebcbd47e1a933d08a910))

## [2.13.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.8...v2.13.0) (2026-04-02)


### Bug Fixes

* promote v2.13.0-rc.8 to stable 2.13.0 ([ab194d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ab194d26cf941b4ffa8db7a40f7c34ef64523ca2))

## [2.13.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.7...v2.13.0-rc.8) (2026-04-02)


### Bug Fixes

* **ci:** exclude desktop-v tags from RC auto-detection in promote workflow ([7167eef](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7167eef8fdfa2b6dd0c7a64ea23b8f470e4fa921))

## [2.13.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.6...v2.13.0-rc.7) (2026-04-02)


### Bug Fixes

* **mcp:** extract PKG_VERSION to version.ts to avoid ESM circular import ([8ab3f9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ab3f9f87b7265b272d5d474655bfd6eae4bde90))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([07a41f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07a41f295e3592185beb278f051468a3f25817ad))
* **mcp:** resolve tools/list empty array and inject dynamic version ([#477](https://github.com/minhoyoo-iotrust/WAIaaS/issues/477), [#478](https://github.com/minhoyoo-iotrust/WAIaaS/issues/478)) ([cffc072](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cffc072b209313ab5ff62f719df0ae3953964cc6))

## [2.13.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.5...v2.13.0-rc.6) (2026-04-02)


### Bug Fixes

* **ci:** mark desktop RC releases as prerelease on GitHub ([20eab21](https://github.com/minhoyoo-iotrust/WAIaaS/commit/20eab2192241cb2648d9247824b8665a494e56cd))
* **ci:** mark desktop RC releases as prerelease on GitHub ([#476](https://github.com/minhoyoo-iotrust/WAIaaS/issues/476)) ([535c70f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/535c70f9ad519ab2275b76e51a90c765fd73b581))

## [2.13.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.4...v2.13.0-rc.5) (2026-04-01)


### Bug Fixes

* **ci:** disable Windows desktop build, restore release-please version sync ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([a8d5a02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a8d5a02662897b77d0ad1b60d9265cafc46c813a))
* **ci:** install desktop deps separately and use npx --prefix ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([91c6519](https://github.com/minhoyoo-iotrust/WAIaaS/commit/91c6519e8a42c5f4ac2c29854bcb83b8ec594000))
* **ci:** remove tauriScript to let tauri-action install CLI itself ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([ce9c2d9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce9c2d9c12cd5cd41503ea10e8ee234a96d439f7))
* **ci:** scope desktop build to daemon/CLI packages only ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b94bb37](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b94bb376e7f0baa48028a3f9a4be7480d9d8f95a))
* **ci:** use correct package name @waiaas/desktop in turbo filter ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([03bfcd6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03bfcd65f805a029adaf981ae0d52ff6c8175781))
* **ci:** use npx tauri instead of pnpm tauri for CLI resolution ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([5cf1804](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cf18049f43df023f220e5432864ed77e4ecee90))
* **ci:** use pnpm --filter instead of turbo --filter for desktop build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([1f17747](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f17747f7b5fead2ca527d5670918f49cd47e7d7))
* **ci:** use turbo --filter=@waiaas/cli... for scoped SEA build ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([33cf737](https://github.com/minhoyoo-iotrust/WAIaaS/commit/33cf73750d2fece181fa217552f6bb06293a51a8))
* desktop build pipeline — issues [#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472) [#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473) [#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474) ([f399203](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f39920318c4e4480d6bd1530c5dabe9a01ec7a59))
* **desktop:** add icon.ico/icon.icns and remove Apple signing env ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([3fe9779](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fe9779a5f372be0dc45e5638415fb2b224cc487))
* **desktop:** add legacy Solana deps to esbuild external list ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([7705b2f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7705b2fe8b61a81b13e99f5a8b623dde4a46f626))
* **desktop:** add remaining Solana transitive deps to esbuild external ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([b46972e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b46972e4c3853fc94df67096037f79dbe9be2081))
* **desktop:** decouple desktop version from release-please ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([950e8c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/950e8c66382eee16bad40c1e0dab818a7f42acdb))
* **desktop:** replace placeholder icons with favicon-based icon set ([#474](https://github.com/minhoyoo-iotrust/WAIaaS/issues/474)) ([d0980c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0980c3ff14429f92841b17e367a9ec13df70292))
* **desktop:** set Ed25519 updater public key in tauri.conf.json ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([8bfc4bf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8bfc4bffb5ab8a5f596b84678c8c943ee8b9330d))
* **desktop:** update Windows API calls for windows crate v0.58 ([#472](https://github.com/minhoyoo-iotrust/WAIaaS/issues/472)) ([2759796](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2759796ec182500079fb339c81cab565e352cd4a))
* **desktop:** use fixed port 3100 instead of dynamic port 0 ([#473](https://github.com/minhoyoo-iotrust/WAIaaS/issues/473)) ([46dd1b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46dd1b2b0317954e0769ddb3573f1137eee649d8))

## [2.13.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.3...v2.13.0-rc.4) (2026-04-01)


### Bug Fixes

* **ci:** add workspace build step to desktop release pipeline ([#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471)) ([689a974](https://github.com/minhoyoo-iotrust/WAIaaS/commit/689a974040550470c842cb9d59177a9f79527b84))
* **ci:** merge approval-gate into deploy job to eliminate double approval ([#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470)) ([9a8a2f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9a8a2f5a5fe402f236b51b44366cb48b82cce14d))
* resolve issues [#469](https://github.com/minhoyoo-iotrust/WAIaaS/issues/469) [#470](https://github.com/minhoyoo-iotrust/WAIaaS/issues/470) [#471](https://github.com/minhoyoo-iotrust/WAIaaS/issues/471) ([1547af0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1547af0c7d1cc84cc1c1d312f2b885eee2c6da3a))
* **site:** replace Korean fallback text with English on download page ([4f4a8ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f4a8eec3eaab091268a1bcbcba39a0e57d294ab))

## [2.13.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.2...v2.13.0-rc.3) (2026-04-01)


### Features

* **436-01:** add pagination to sessions and policies list APIs ([b5bd519](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b5bd519abedae723d204c81d6f1b8f31d3005a46))
* **436-02:** add SDK listSessions/listPolicies and MCP list_sessions tool ([bf405e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf405e14729327dbd6e6634820471bc57bff3292))
* **438-02:** add ILogger interface + ConsoleLogger in @waiaas/core ([e5d61e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e5d61e685478e3cf4ea424ab81594fdc2939a101))
* **438-02:** centralize Solana adapter error handling with mapError() ([5316a64](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5316a64363af280dae98cf5b9d2dd79635e86fa0))
* **439-01:** add CRT-themed article CSS for long-form content ([181e681](https://github.com/minhoyoo-iotrust/WAIaaS/commit/181e6813b182b97750097c7026e8be70cb87176c))
* **439-01:** add markdown-to-HTML build script and template ([17b6d39](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17b6d39e30d279a12b7ce930c0bc8cebd56cabec))
* **440-01:** add Blog/Docs listing pages and navigation integration ([f31a32b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f31a32b6072efc30e591a53bb34668cac364e1dc))
* **440-01:** add internal link validation and content stats to build ([3df91b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3df91b0f0d95e84f4018ae0758107911f8481553))
* **441-01:** add auto-generated sitemap.xml and JSON-LD structured data ([40bacff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/40bacff2fa8e4b1e80e648be854d2d706fc46131))
* **441-02:** add llms-full.txt auto-generation and pillar-cluster internal links ([07a6401](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07a64013538cb600fa2e374c63fd3fdbd3e3cbac))
* **441-02:** expand FAQ to 20 Q&As with visual accordion section ([74436e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/74436e4b1a066cf292d9224d9292cd23ee17ba85))
* **443-01:** add 3 SEO landing pages for AI wallet category keywords ([a87c64b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a87c64bc9a62fe45e4c1ee27b8efde8e63635b90))
* **449-01:** replace ntfy with push_relay in core schemas ([b396882](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b396882eee0c9b0367b6f1983234d9cb2e208e5d))
* **449-01:** update sign-request-builder to push_relay + fix schema-ddl CHECK ([cfdf198](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cfdf198ac691e7d63da2e1abcb554ac2cf4ad0ef))
* **449-02:** add DB v60 migration for push_relay_url + ntfy cleanup ([5d081e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d081e63392f29e84b9feca4df50f97c00e1c6ac))
* **449-03:** add sign_responses DB store + rewrite sign-response-routes ([8815ccb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8815ccb1b6ef625c3f52624001613ca3d6c15624))
* **449-03:** remove ntfy code from push-relay, add direct push API ([ff16b1f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff16b1ff4741f404abe5ffbf653f4942725fa092))
* **450-01:** replace NtfySigningChannel with PushRelaySigningChannel ([47a35ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/47a35adb5ebd39389608b245b855b85bbfe4a91b))
* **450-01:** update ApprovalChannelRouter and daemon startup for sdk_push ([8ddebcc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ddebcc55cd776d771c62e4d7822d7195af48749))
* **450-02:** rewrite WalletNotificationChannel to use Push Relay HTTP POST ([34bef0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34bef0dc308ade802abeadbe1110a781dbb5cbb1))
* **451-01:** add push_relay_url to WalletApp API and fix notification channel ([095eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/095eec91b86e505aeead960818923ae563c16189))
* **451-01:** deprecate SDK ntfy channel functions ([2af5fb4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af5fb4ca5d08dde97533f26b92bab8ee4bc7883))
* **451-02:** update Admin UI human-wallet-apps from ntfy to Push Relay ([03e1fec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03e1fec05285be7f7d3cace316c7794349d5405f))
* **451-02:** update wallets.tsx approval method labels from ntfy to Push ([77e9f0b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/77e9f0b96a9d54539abc948c8b0f263fd79cd0df))
* **453-02:** remove admin/setup skills and update registry/installer ([921a8d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/921a8d4c1d94ca49f08c8d2e9af6f5d85e981fa5))
* **453-02:** remove masterAuth content from all skill files ([97d4ec4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/97d4ec44358a2b3c732ea72503660ee063fc4fda))
* **454-01:** scaffold @waiaas/openclaw-plugin package ([18beaf8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18beaf8b478edd0613f7fafee4823b82fd7964c2))
* **454-02:** implement 17 sessionAuth tools for OpenClaw plugin ([83f0d75](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83f0d75582dd532d07f9b03a7115909ffdf7a741))
* **455-01:** integrate openclaw-plugin into release and publish pipelines ([75860e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75860e4d298d3272cfd1aa4b57f791eccb113143))
* **455-02:** rewrite openclaw-integration.md + add openclaw-plugin SEO page + rebuild site ([b26d493](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b26d49303f9435e4220b3c02011cc353ea546a12))
* **459-01:** create Tauri spike project with @reown/appkit integration ([a924e7a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a924e7a8f8d77cb305a61e9acb5320ba0b35362a))
* **460-01:** Tauri 2 project scaffolding + SidecarManager implementation ([8fb9b4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8fb9b4e43ec5cccaf11e1378ecfe44da887cc412))
* **460-02:** SEA binary build pipeline + native-loader + dynamic port output ([6c4e8ca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c4e8ca9ea8e7a14a1d269080365e1ff2ca809e3))
* **460-03:** splash -&gt; daemon start -&gt; WebView navigate integration ([85b4173](https://github.com/minhoyoo-iotrust/WAIaaS/commit/85b41734d91456f3ffc576570051a53ab31391a3))
* **461-01:** add 4-layer tree-shaking config and CI bundle verification ([2aae71b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2aae71beca2c8828d15d4cf1e3a010c2f4062a41))
* **461-01:** add quit_app IPC command, isDesktop() detection, and TS bridge wrappers ([24b43f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24b43f1ff62151fbdadc27960da5b50f5aa9b4cb))
* **461-02:** add system tray module with 3-color icons, context menu, and 30s health polling ([43412e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43412e745444295e2bf2fb6b04aea86f6c259ade))
* **461-02:** integrate system tray in main.rs with tray-icon and image-png features ([00b1116](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00b11161895e5cb9072a4c709e6d671b47377c65))
* **462-01:** Setup Wizard orchestrator + App.tsx dynamic import integration ([7c19769](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c19769b19cf9cd6681f232c7e5f7d0c30358880))
* **462-01:** wizard store + 5 step components for Desktop Setup Wizard ([b4b89af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4b89afefb1e834eef8ed0ac401c0e3955e56fff))
* **462-02:** WalletConnect QR connector + modal via daemon REST API (Plan B) ([7153984](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7153984cb4a7aa5eba7181e98c7b7dcd73853994))
* **462-03:** wire Owner step to WalletConnect QR modal via dynamic imports ([5cb0c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cb0c992201c2b8d7a096f265405e4799b4a8359))
* **463-01:** integrate Tauri updater plugin with Ed25519 signing config ([17ce11b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17ce11be358bcfee3b53a7e62bdd52837ce03fb4))
* **463-02:** add 3-platform desktop release CI workflow ([bff990d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bff990d7c66ba0555d114ccefb6d7de22419d1a9))
* **463-03:** add auto-update UI with UpdateBanner and update-checker ([3348fa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3348fa3d6541ea159e5b3c23525fedc246bb6cb5))
* **465-01:** add download page with OS detection and GitHub API integration ([14c6373](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14c63733ce852ac03412d0f78ab74e242462ab9b))
* **466-01:** add Desktop App distribution channels to SUBMISSION_KIT ([48ef4ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/48ef4ad6c4020aef9b1ff12cd1d260ebd47f61cd))
* **466-01:** add Download link to site navigation and sitemap ([d8b8efd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8b8efdc2e1d9ffdcfdf7871bcbae7e5ccc96354))
* add debug logging to Action Provider API clients ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([9d71a26](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d71a264941d468c141a0a9103b3885db7723a8d))
* add debug logging to all Action Provider API clients and SDK wrappers ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([aa31bfd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aa31bfd22d0cbe8df6e855d3f569632fbfdc834c))
* add DeFi position exit and DCent Swap extended UAT scenarios ([016b160](https://github.com/minhoyoo-iotrust/WAIaaS/commit/016b160e273890f0d0a6130f17095aaea222e433))
* add Env column and --env filter to Agent UAT scenarios ([4c03900](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c03900fd9eea20cfae99f5f196305d92969d0e4))
* **daemon,admin:** add test sign request for wallet apps ([#450](https://github.com/minhoyoo-iotrust/WAIaaS/issues/450)) ([d46e79e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d46e79e856e5e3db5bc7cbb3e4ace71e7f187020))
* **daemon,push-relay:** fix [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, fix [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) static_fields wiring ([521b7ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/521b7ac6eb0ac4908efdecaf9d95fefeb0143f55))
* integrate Dev.to blog posts into waiaas.ai/blog ([f9e74bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9e74bb79a0e34885816ab091c89701f578f6c56))
* **push-relay:** enhance debug logging for push payloads and sign responses ([#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458)) ([745fcee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/745fcee239c744ee7202ac8b541a0007fca8d26a))


### Bug Fixes

* **436-01:** update session list assertions for paginated response format ([bd9c37b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd9c37b02a3c4c784f82915a12160e589784c552))
* **436-02:** fix TypeScript strict null assertions in SDK pagination tests ([3e1dd11](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e1dd118b51065da6aad10f795a45cb10ed166d1))
* **436-02:** update MCP server tool count to 42 after list_sessions addition ([fc53fdb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc53fdb56a295dfe93ea92643eb38869a30c5ebe))
* **436:** update E2E test assertions for paginated session/policy responses ([fefbb73](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fefbb73101966d08224456341ef387c59633e1bc))
* **450-01:** update remaining ntfy references in SDK tests and preset-auto-setup ([efae3ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/efae3ff1b1fe8d5317af6f0c5bf37508e9ec55c9))
* add eslint-disable for [@ts-ignore](https://github.com/ts-ignore) on optional SDK imports ([0fbd32b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fbd32b4cd9b1bc819e0733403e8d4bc3fa2d08a))
* add GET /policies/:id route and fix unused import lint errors ([b28c5b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b28c5b5f47a98057365e87ea68fd07151d410eef))
* add missing type field to tauri.conf.json extra-file in release-please config ([590d0dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/590d0dc6a384ed6e61ee2fe7f9dcf48661e1293e))
* add non-null assertions to dcent-debug-dumper test for strict typecheck ([1ded5c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ded5c65a61d094ae007a4d664b959f67cec5954))
* add subscription staggering and ILogger injection for IncomingTxMonitor ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429), [#430](https://github.com/minhoyoo-iotrust/WAIaaS/issues/430)) ([f129a3c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f129a3c76a149f07f9dea58f699f76ec6989dcd5))
* **admin,push-relay:** resolve issues 432-436 ([1ba3cb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ba3cb8fb36f3f1582f70aba0ad05e67255000d7))
* **admin,push-relay:** resolve issues 432-436 ([0280d2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0280d2e409c616f042eeb3d30e07b2ed16439a07))
* align SDK test assertions with actual URL query values ([4a279b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4a279b4d1511fc2406224e21d05a431196d64861))
* **ci:** fix release pipeline startup_failure ([a43930b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a43930b0e4aae6a6ff552938d8a3182fd4805a15))
* **ci:** read version from package.json instead of GitHub Releases API ([#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457)) ([b73449e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b73449ea92fdc7a795996752395b0fb49d7f1e1d))
* **ci:** restore environment: production on deploy job for npm OIDC auth ([75c4dc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75c4dc10a38822d12b6fa22556ae06aee361fc86))
* **ci:** use RELEASE_PAT for release-please auto-merge and add synchronize trigger ([0a7706f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a7706f5864bbbfdde153fbefeeca9ccdf5cb139))
* concise error messages for viem errors + register issue [#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431) ([b9cd4cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b9cd4ccd08b14be58adb2ec375de0a862263e30c))
* correct DCent Swap UAT scenario API endpoints and amounts ([2a53b47](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a53b47980ffea7959cb2c74b0b06317fdd5c2bc))
* correct DexSwapTxParams field names in debug dumper tests ([e3b165c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e3b165c5055af84ce8b52badd9560513ca7bca95))
* correct Lido testnet contract addresses from Holesky to Sepolia ([73ef0c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/73ef0c3432e018e82322b60dbe378bece158982e))
* **daemon,admin,push-relay:** resolve issues 451-452 — sign request push body and toast args ([e24940c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e24940c1b23720ce3899c3322ccb7a07513b8043))
* **daemon,admin:** resolve issues 437-442 ([81e7405](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81e7405a4da1685476675ba9cec1d1c5332ec7ff))
* **daemon,wallet-sdk:** add owner address to test sign request ([#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)) and remove ntfy remnants ([#463](https://github.com/minhoyoo-iotrust/WAIaaS/issues/463)) ([81092e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81092e71bc3df8df792fdc8c7314b9fd52128816))
* **daemon:** extract buildSignRequestPushPayload helper to fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) base64 format bug ([7788c66](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7788c669d6d936df5b56c0d49b00aeae5a7dcba6))
* **daemon:** fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) admin test sign request base64 format bug ([1981a78](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1981a78f21ad0f9bc2050f1c962685515afa7e11))
* **daemon:** promote startup step logs from debug to info level ([75d5ec8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75d5ec8a4f8299b1974643583f39d7d60cb5db09))
* **daemon:** remove OpenAPI body schema from test-sign-request to allow empty body ([d8e63d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8e63d1545a40afe9bf8f0704b4b2f2828c1ee80))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([290fed4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/290fed49d0ddbbc94e90213ac2c4a820bcbd3719))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([d6c462c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6c462cc613ce9cf1fed6667e7c57b48d0bb0973))
* **daemon:** resolve issue 449 — use subscription_token for Push Relay routing ([42ebfb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42ebfb84174c79c832a00079eb95f7771216ec80))
* **daemon:** resolve issues 443-444 — approval timeout policy passthrough and hot-reload ([441a431](https://github.com/minhoyoo-iotrust/WAIaaS/commit/441a431615660fd8112e0972353e021bd816464d))
* **daemon:** resolve issues 446-448 — DELAY cancel keyboard and TX_QUEUED notification enrichment ([c1e97ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1e97ba3a0c00c403ee613b04e5fd3e024d73281))
* **daemon:** send flat SignRequest fields in Push Relay payload ([#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456)) ([8c1d0e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c1d0e528f2cee93121874dd64584ac36e5b06a7))
* **db:** rebuild wallets table in v60 migration to update CHECK constraint ([7d933f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d933f414502eef8c4c15f53ba5ac667dc9e9b8c))
* defer PositionTracker sync and increase stagger delay ([#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431)) ([ca8613d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca8613d6935661873ae8ffe6f9bcba8a55b780b6))
* extract concise one-line error messages from viem errors ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429)) ([1aed766](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1aed7662ddeab8b466b14f0648f1985f5ac28097))
* include error details in Telegram Bot retry warning logs ([99b1002](https://github.com/minhoyoo-iotrust/WAIaaS/commit/99b10026e45f9f7744b4e1465817414f9062ab67))
* IncomingTxMonitor startup stability and auto-merge CI ([596805b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/596805bbfcf3c0b81f9a4232c7c8ba52b2d96955))
* normalize EVM token addresses with EIP-55 checksum validation ([d0d7229](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0d72295f143a06be779f9c42d59fad8f63e60de)), closes [#379](https://github.com/minhoyoo-iotrust/WAIaaS/issues/379)
* pass rpcUrl to Jito provider via registerBuiltInProviders and fix fetch mock reuse ([6b904fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6b904fd2b9ec088ff3ba292f278d063501653429))
* pass rpcUrl to Kamino/Drift SDK, accept Pendle array response, and auto-resolve DCent decimals ([0120f1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0120f1baf666e753083428e7b6157505a1a57d4c))
* promote v2.11.0-rc.27 to stable 2.11.0 ([67a3828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/67a3828de6c863a167d34456cc197b6c1387de0a))
* promote v2.12.0-rc.16 to stable 2.12.0 ([95b33a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95b33a06e8b3e2be9fd161ae8005dff26db76dd4))
* remove build script from desktop-spike to unblock CI ([bf21754](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf21754a1847745a29aeec1827092076bd37e9a9))
* remove duplicate H1 title on SEO pages ([ae3ba56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae3ba5659cb980ef4b1befb96ed9bc7a3d5c4b55))
* remove formatAmount() from DCent Swap API calls ([646366f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/646366fde152657bc5b553e191e9ecaca76ea165))
* remove ntfy channel status from admin-notifications API ([be542b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/be542b0de98bac461ec2e6c6fc3e5df35f5a174c))
* remove obsolete cancelTopicEdit test for removed feature ([6875180](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68751803a293c5c7f639f6d9f825233d4b7f31a4))
* remove stale ntfy references from tests and admin UI ([19529b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19529b73dc9a987c5f42af1b05af50dddc57910f))
* remove unused testBytes variable in dcent-dex-swap test ([8d8232c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d8232c76377dbfccc947c4b7444b6c25b8f5fa5))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([dc15212](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dc15212298a8bafa4dfbc76181cae997ce98a207))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([10313e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10313e0accde7ba3ca495fe451364fe67e5be21c))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([2af859e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af859eb35c7233a98a77210a34aa578fbe4cded))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([8a567e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8a567e5371fc6b350987ede1944e6581c4d7957d))
* resolve issue [#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — Drift SDK authority + uninitialized user handling ([466210a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/466210aa966f8db5de25f150c44c7df5131dd6f2))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi position tracking, token registry, DCent Swap ([fe09ade](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe09ade08fe61dcd0df29e29442afb37f1668866))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi positions, token registry, DCent Swap ([96d0003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96d00038fb6d2023b212122b448df8e37247341b))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi providers, positions, UAT scenarios ([c6c2767](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6c2767b786c08eb8789a58af0df336f78384254))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi UAT, Jupiter ALT, Jito accounts, Pendle schema, SDK install, Aave decimals, PositionTracker sync ([c202e4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c202e4eacb9f205871621d93bd4d663b47ea59e9))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 ([e314a74](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e314a74e5a1056e3560ba3c368eaa59442742ae7))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 — daemon log level, DeFi UAT fixes, RPC hint ([2d62a13](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d62a13c998a2caa913016a082ac0f853c9e22dd))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#427](https://github.com/minhoyoo-iotrust/WAIaaS/issues/427) — nightly CI, RPC pool seeding, Drift SDK compat, DCent swap fixes ([4210b24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4210b2420405e84f19b7e8eacf9897c190f95f9c))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — DeFi UAT fixes, RPC pool seeding, DCent swap corrections ([885531d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/885531db15e06d379d0843280a401945379e96d6))
* resolve Kamino/Drift RPC URL, Pendle schema regression, and DCent decimals auto-resolution ([e2e9da3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e2e9da398eece343d23121b223eeb6e82345de92))
* resolve lint errors in push-relay-signing-channel and signing-sdk-e2e test ([9fbc3bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fbc3bb3ac49d333e300e36508e02d39cf93dd0d))
* resolve open issues [#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456), [#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457), [#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458) ([ff0d22c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff0d22c757eb6707b264195e642352dd125bff16))
* resolve open issues [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) push relay static_fields ([ae308fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae308fb3383eeee52e58235918baf791cfa4be22))
* resolve open issues [#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)-[#464](https://github.com/minhoyoo-iotrust/WAIaaS/issues/464) — owner address, ntfy cleanup, docs update ([825f4aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/825f4aa6f9dd0d48f9bee754e5b79877b35b86b5))
* resolve open issues 437-452 ([c6cb6d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6cb6d7b45ee64dd9ed18917d246423c9cb824bb))
* resolve PositionTracker RPC URLs via RpcPool for DeFi dashboard ([62539c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62539c79117af45c76f090d5a0954bdb3ced8aab)), closes [#380](https://github.com/minhoyoo-iotrust/WAIaaS/issues/380)
* resolve TS18048 in action-api-client test mock type ([0a87ea4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a87ea4b1ecc1a78420f207f6404c8bce932362d))
* resolve type errors in SDK client-coverage test ([7740848](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7740848448635b7875e11e03a7ed1ecb10560af2))
* resolve unused variable and empty block lint errors in CLI tests ([0b9c23c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0b9c23cedc89405f2de4fb7064d169dcfb1ed0fe))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([3848624](https://github.com/minhoyoo-iotrust/WAIaaS/commit/384862499a0eb9a3f399501eb0a6202bf30088d5))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([#465](https://github.com/minhoyoo-iotrust/WAIaaS/issues/465), [#466](https://github.com/minhoyoo-iotrust/WAIaaS/issues/466), [#467](https://github.com/minhoyoo-iotrust/WAIaaS/issues/467)) ([038ee36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/038ee36ca0772382b68b7bc7926a4e554737b194))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([f2275dd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f2275dd2a3019b617bd2c2a5ba2f52eee22e1ded))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([888c902](https://github.com/minhoyoo-iotrust/WAIaaS/commit/888c902ba176a01b322c8e400e5c4f0790380b44))
* **site:** add state=all to Dev.to API query to include all published posts ([88930f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88930f0fdd196d00f43508e401a9220fb4676e06))
* **site:** bypass Dev.to CDN cache with API key authentication ([9fc4bab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fc4babdb2ed94433e288e1eab7c8e2507afee69))
* **site:** pass API key to individual Dev.to article fetches ([a6675ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6675ee2d968e5a5c5a5cba9fae2078970903add))
* **solana:** resolve eslint no-this-alias and no-unsafe-function-type errors ([187be72](https://github.com/minhoyoo-iotrust/WAIaaS/commit/187be727efcfd14ab3456c920a9da0cc3549806d))
* **solana:** resolve require-yield lint errors in test async iterables ([54fc046](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54fc0469b248e907dbcb525649e89f4902f616ec))
* update pnpm-lock.yaml for Tauri desktop dependencies ([f3b5c94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3b5c94e703556c83b6c89ef53e6e76810209d55))
* use [@ts-ignore](https://github.com/ts-ignore) for optional SDK imports to support CI without optional deps ([c9a5dd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9a5dd440f0972142bbc98f7df5cabaf91da2e2c))
* **wallet-sdk:** simplify decodeInlineData to restore 100% coverage ([7780a24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7780a24cd07c6be65f611a92542cdfbed7360142))


### Code Refactoring

* **435-01:** batch queries in admin-monitoring agent-prompt ([777593d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/777593d735d4b4f0e225de975c331df45ed9bfbf))
* **435-01:** batch session wallet queries in sessions.ts ([0d3db8b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d3db8b459f2f19721a7dd702da5f84e9f5f777a))
* **435-02:** add tokenMap parameter to formatTxAmount and batch helper ([be066e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/be066e1c5e224963ac602d7364bd1173cd75ebec))
* **435-02:** update remaining call sites to use batch tokenMap ([0170429](https://github.com/minhoyoo-iotrust/WAIaaS/commit/017042956aa5f3eb498368c9ebfba24d6a5d2a9d))
* **437-01:** split migrate.ts into schema-ddl + 6 migration modules ([fcf3ccf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fcf3ccfac5982b07007b7d757696872c1bef2c59))
* **437-02:** replace all inline import() types with static import type in daemon.ts ([07c4702](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07c47025da12bc8997303a1d547535867e57211d))
* **437-02:** split daemon.ts into startup/shutdown/pipeline modules ([d5e2fff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5e2fffc9c37e703c1f5550e527d3e540627b00f))
* **437-03:** split database-policy-engine.ts into 6 evaluator modules ([092b0e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/092b0e411316227aa1adad4f4aa24e9be829fb7e))
* **438-01:** split stages.ts into 6 stage files + pipeline-helpers + barrel re-export ([06f92e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/06f92e1ba4aa8bcc580f8ea2ce0b423a103ade94))
* **452-01:** rename docs/guides/ to docs/agent-guides/ ([e235d2b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e235d2b2fc332c72652852bb6eb02dd84c3dabcf))

## [2.13.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc.1...v2.13.0-rc.2) (2026-04-01)


### Bug Fixes

* **ci:** fix release pipeline startup_failure ([a43930b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a43930b0e4aae6a6ff552938d8a3182fd4805a15))

## [2.13.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.13.0-rc...v2.13.0-rc.1) (2026-04-01)


### Features

* **465-01:** add download page with OS detection and GitHub API integration ([14c6373](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14c63733ce852ac03412d0f78ab74e242462ab9b))
* **466-01:** add Desktop App distribution channels to SUBMISSION_KIT ([48ef4ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/48ef4ad6c4020aef9b1ff12cd1d260ebd47f61cd))
* **466-01:** add Download link to site navigation and sitemap ([d8b8efd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8b8efdc2e1d9ffdcfdf7871bcbae7e5ccc96354))


### Bug Fixes

* add missing type field to tauri.conf.json extra-file in release-please config ([590d0dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/590d0dc6a384ed6e61ee2fe7f9dcf48661e1293e))

## [2.13.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0...v2.13.0-rc) (2026-04-01)


### Features

* **459-01:** create Tauri spike project with @reown/appkit integration ([a924e7a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a924e7a8f8d77cb305a61e9acb5320ba0b35362a))
* **460-01:** Tauri 2 project scaffolding + SidecarManager implementation ([8fb9b4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8fb9b4e43ec5cccaf11e1378ecfe44da887cc412))
* **460-02:** SEA binary build pipeline + native-loader + dynamic port output ([6c4e8ca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c4e8ca9ea8e7a14a1d269080365e1ff2ca809e3))
* **460-03:** splash -&gt; daemon start -&gt; WebView navigate integration ([85b4173](https://github.com/minhoyoo-iotrust/WAIaaS/commit/85b41734d91456f3ffc576570051a53ab31391a3))
* **461-01:** add 4-layer tree-shaking config and CI bundle verification ([2aae71b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2aae71beca2c8828d15d4cf1e3a010c2f4062a41))
* **461-01:** add quit_app IPC command, isDesktop() detection, and TS bridge wrappers ([24b43f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24b43f1ff62151fbdadc27960da5b50f5aa9b4cb))
* **461-02:** add system tray module with 3-color icons, context menu, and 30s health polling ([43412e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43412e745444295e2bf2fb6b04aea86f6c259ade))
* **461-02:** integrate system tray in main.rs with tray-icon and image-png features ([00b1116](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00b11161895e5cb9072a4c709e6d671b47377c65))
* **462-01:** Setup Wizard orchestrator + App.tsx dynamic import integration ([7c19769](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c19769b19cf9cd6681f232c7e5f7d0c30358880))
* **462-01:** wizard store + 5 step components for Desktop Setup Wizard ([b4b89af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4b89afefb1e834eef8ed0ac401c0e3955e56fff))
* **462-02:** WalletConnect QR connector + modal via daemon REST API (Plan B) ([7153984](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7153984cb4a7aa5eba7181e98c7b7dcd73853994))
* **462-03:** wire Owner step to WalletConnect QR modal via dynamic imports ([5cb0c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5cb0c992201c2b8d7a096f265405e4799b4a8359))
* **463-01:** integrate Tauri updater plugin with Ed25519 signing config ([17ce11b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17ce11be358bcfee3b53a7e62bdd52837ce03fb4))
* **463-02:** add 3-platform desktop release CI workflow ([bff990d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bff990d7c66ba0555d114ccefb6d7de22419d1a9))
* **463-03:** add auto-update UI with UpdateBanner and update-checker ([3348fa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3348fa3d6541ea159e5b3c23525fedc246bb6cb5))


### Bug Fixes

* remove build script from desktop-spike to unblock CI ([bf21754](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf21754a1847745a29aeec1827092076bd37e9a9))
* update pnpm-lock.yaml for Tauri desktop dependencies ([f3b5c94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3b5c94e703556c83b6c89ef53e6e76810209d55))

## [2.12.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.16...v2.12.0) (2026-03-31)


### Bug Fixes

* promote v2.12.0-rc.16 to stable 2.12.0 ([95b33a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95b33a06e8b3e2be9fd161ae8005dff26db76dd4))

## [2.12.0-rc.16](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.15...v2.12.0-rc.16) (2026-03-26)


### Bug Fixes

* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([3848624](https://github.com/minhoyoo-iotrust/WAIaaS/commit/384862499a0eb9a3f399501eb0a6202bf30088d5))
* **signing:** add missing API key to sendViaRelay and fix base64 response parsing ([#465](https://github.com/minhoyoo-iotrust/WAIaaS/issues/465), [#466](https://github.com/minhoyoo-iotrust/WAIaaS/issues/466), [#467](https://github.com/minhoyoo-iotrust/WAIaaS/issues/467)) ([038ee36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/038ee36ca0772382b68b7bc7926a4e554737b194))

## [2.12.0-rc.15](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.14...v2.12.0-rc.15) (2026-03-26)


### Bug Fixes

* **daemon,wallet-sdk:** add owner address to test sign request ([#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)) and remove ntfy remnants ([#463](https://github.com/minhoyoo-iotrust/WAIaaS/issues/463)) ([81092e7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81092e71bc3df8df792fdc8c7314b9fd52128816))
* **daemon:** remove OpenAPI body schema from test-sign-request to allow empty body ([d8e63d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8e63d1545a40afe9bf8f0704b4b2f2828c1ee80))
* resolve open issues [#462](https://github.com/minhoyoo-iotrust/WAIaaS/issues/462)-[#464](https://github.com/minhoyoo-iotrust/WAIaaS/issues/464) — owner address, ntfy cleanup, docs update ([825f4aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/825f4aa6f9dd0d48f9bee754e5b79877b35b86b5))
* **wallet-sdk:** simplify decodeInlineData to restore 100% coverage ([7780a24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7780a24cd07c6be65f611a92542cdfbed7360142))

## [2.12.0-rc.14](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.13...v2.12.0-rc.14) (2026-03-25)


### Bug Fixes

* **daemon:** extract buildSignRequestPushPayload helper to fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) base64 format bug ([7788c66](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7788c669d6d936df5b56c0d49b00aeae5a7dcba6))
* **daemon:** fix [#461](https://github.com/minhoyoo-iotrust/WAIaaS/issues/461) admin test sign request base64 format bug ([1981a78](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1981a78f21ad0f9bc2050f1c962685515afa7e11))

## [2.12.0-rc.13](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.12...v2.12.0-rc.13) (2026-03-25)


### Features

* **daemon,push-relay:** fix [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, fix [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) static_fields wiring ([521b7ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/521b7ac6eb0ac4908efdecaf9d95fefeb0143f55))


### Bug Fixes

* resolve open issues [#459](https://github.com/minhoyoo-iotrust/WAIaaS/issues/459) session wallet query, [#460](https://github.com/minhoyoo-iotrust/WAIaaS/issues/460) push relay static_fields ([ae308fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae308fb3383eeee52e58235918baf791cfa4be22))

## [2.12.0-rc.12](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.11...v2.12.0-rc.12) (2026-03-25)


### Features

* **push-relay:** enhance debug logging for push payloads and sign responses ([#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458)) ([745fcee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/745fcee239c744ee7202ac8b541a0007fca8d26a))


### Bug Fixes

* **ci:** read version from package.json instead of GitHub Releases API ([#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457)) ([b73449e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b73449ea92fdc7a795996752395b0fb49d7f1e1d))
* **daemon:** send flat SignRequest fields in Push Relay payload ([#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456)) ([8c1d0e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c1d0e528f2cee93121874dd64584ac36e5b06a7))
* resolve open issues [#456](https://github.com/minhoyoo-iotrust/WAIaaS/issues/456), [#457](https://github.com/minhoyoo-iotrust/WAIaaS/issues/457), [#458](https://github.com/minhoyoo-iotrust/WAIaaS/issues/458) ([ff0d22c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff0d22c757eb6707b264195e642352dd125bff16))

## [2.12.0-rc.11](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.10...v2.12.0-rc.11) (2026-03-25)


### Bug Fixes

* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([290fed4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/290fed49d0ddbbc94e90213ac2c4a820bcbd3719))
* **daemon:** replace periodic position sync with startup-once + action-triggered ([#455](https://github.com/minhoyoo-iotrust/WAIaaS/issues/455)) ([d6c462c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6c462cc613ce9cf1fed6667e7c57b48d0bb0973))

## [2.12.0-rc.10](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.9...v2.12.0-rc.10) (2026-03-25)


### Bug Fixes

* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([f2275dd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f2275dd2a3019b617bd2c2a5ba2f52eee22e1ded))
* **site,solana:** resolve Dev.to CDN cache and Solana WS 429 flood ([#453](https://github.com/minhoyoo-iotrust/WAIaaS/issues/453), [#454](https://github.com/minhoyoo-iotrust/WAIaaS/issues/454)) ([888c902](https://github.com/minhoyoo-iotrust/WAIaaS/commit/888c902ba176a01b322c8e400e5c4f0790380b44))
* **solana:** resolve eslint no-this-alias and no-unsafe-function-type errors ([187be72](https://github.com/minhoyoo-iotrust/WAIaaS/commit/187be727efcfd14ab3456c920a9da0cc3549806d))
* **solana:** resolve require-yield lint errors in test async iterables ([54fc046](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54fc0469b248e907dbcb525649e89f4902f616ec))

## [2.12.0-rc.9](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.8...v2.12.0-rc.9) (2026-03-25)


### Bug Fixes

* **site:** pass API key to individual Dev.to article fetches ([a6675ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6675ee2d968e5a5c5a5cba9fae2078970903add))

## [2.12.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.7...v2.12.0-rc.8) (2026-03-24)


### Features

* **daemon,admin:** add test sign request for wallet apps ([#450](https://github.com/minhoyoo-iotrust/WAIaaS/issues/450)) ([d46e79e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d46e79e856e5e3db5bc7cbb3e4ace71e7f187020))


### Bug Fixes

* **daemon,admin,push-relay:** resolve issues 451-452 — sign request push body and toast args ([e24940c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e24940c1b23720ce3899c3322ccb7a07513b8043))
* **daemon,admin:** resolve issues 437-442 ([81e7405](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81e7405a4da1685476675ba9cec1d1c5332ec7ff))
* **daemon:** resolve issue 449 — use subscription_token for Push Relay routing ([42ebfb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42ebfb84174c79c832a00079eb95f7771216ec80))
* **daemon:** resolve issues 443-444 — approval timeout policy passthrough and hot-reload ([441a431](https://github.com/minhoyoo-iotrust/WAIaaS/commit/441a431615660fd8112e0972353e021bd816464d))
* **daemon:** resolve issues 446-448 — DELAY cancel keyboard and TX_QUEUED notification enrichment ([c1e97ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1e97ba3a0c00c403ee613b04e5fd3e024d73281))
* resolve open issues 437-452 ([c6cb6d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6cb6d7b45ee64dd9ed18917d246423c9cb824bb))
* **site:** bypass Dev.to CDN cache with API key authentication ([9fc4bab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fc4babdb2ed94433e288e1eab7c8e2507afee69))

## [2.12.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.6...v2.12.0-rc.7) (2026-03-24)


### Bug Fixes

* **admin,push-relay:** resolve issues 432-436 ([1ba3cb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ba3cb8fb36f3f1582f70aba0ad05e67255000d7))
* **admin,push-relay:** resolve issues 432-436 ([0280d2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0280d2e409c616f042eeb3d30e07b2ed16439a07))
* **daemon:** promote startup step logs from debug to info level ([75d5ec8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75d5ec8a4f8299b1974643583f39d7d60cb5db09))
* **site:** add state=all to Dev.to API query to include all published posts ([88930f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88930f0fdd196d00f43508e401a9220fb4676e06))

## [2.12.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.5...v2.12.0-rc.6) (2026-03-24)


### Bug Fixes

* **ci:** use RELEASE_PAT for release-please auto-merge and add synchronize trigger ([0a7706f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a7706f5864bbbfdde153fbefeeca9ccdf5cb139))

## [2.12.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.4...v2.12.0-rc.5) (2026-03-23)


### Bug Fixes

* add subscription staggering and ILogger injection for IncomingTxMonitor ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429), [#430](https://github.com/minhoyoo-iotrust/WAIaaS/issues/430)) ([f129a3c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f129a3c76a149f07f9dea58f699f76ec6989dcd5))
* concise error messages for viem errors + register issue [#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431) ([b9cd4cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b9cd4ccd08b14be58adb2ec375de0a862263e30c))
* defer PositionTracker sync and increase stagger delay ([#431](https://github.com/minhoyoo-iotrust/WAIaaS/issues/431)) ([ca8613d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca8613d6935661873ae8ffe6f9bcba8a55b780b6))
* extract concise one-line error messages from viem errors ([#429](https://github.com/minhoyoo-iotrust/WAIaaS/issues/429)) ([1aed766](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1aed7662ddeab8b466b14f0648f1985f5ac28097))
* IncomingTxMonitor startup stability and auto-merge CI ([596805b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/596805bbfcf3c0b81f9a4232c7c8ba52b2d96955))

## [2.12.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.3...v2.12.0-rc.4) (2026-03-23)


### Features

* integrate Dev.to blog posts into waiaas.ai/blog ([f9e74bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9e74bb79a0e34885816ab091c89701f578f6c56))

## [2.12.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.2...v2.12.0-rc.3) (2026-03-23)


### Bug Fixes

* remove unused testBytes variable in dcent-dex-swap test ([8d8232c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d8232c76377dbfccc947c4b7444b6c25b8f5fa5))
* resolve issue [#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — Drift SDK authority + uninitialized user handling ([466210a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/466210aa966f8db5de25f150c44c7df5131dd6f2))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#427](https://github.com/minhoyoo-iotrust/WAIaaS/issues/427) — nightly CI, RPC pool seeding, Drift SDK compat, DCent swap fixes ([4210b24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4210b2420405e84f19b7e8eacf9897c190f95f9c))
* resolve issues [#422](https://github.com/minhoyoo-iotrust/WAIaaS/issues/422)-[#428](https://github.com/minhoyoo-iotrust/WAIaaS/issues/428) — DeFi UAT fixes, RPC pool seeding, DCent swap corrections ([885531d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/885531db15e06d379d0843280a401945379e96d6))

## [2.12.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc.1...v2.12.0-rc.2) (2026-03-23)


### Bug Fixes

* add non-null assertions to dcent-debug-dumper test for strict typecheck ([1ded5c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ded5c65a61d094ae007a4d664b959f67cec5954))
* correct DexSwapTxParams field names in debug dumper tests ([e3b165c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e3b165c5055af84ce8b52badd9560513ca7bca95))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 ([e314a74](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e314a74e5a1056e3560ba3c368eaa59442742ae7))
* resolve issues [#418](https://github.com/minhoyoo-iotrust/WAIaaS/issues/418)-421 — daemon log level, DeFi UAT fixes, RPC hint ([2d62a13](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d62a13c998a2caa913016a082ac0f853c9e22dd))

## [2.12.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.12.0-rc...v2.12.0-rc.1) (2026-03-19)


### Bug Fixes

* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([dc15212](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dc15212298a8bafa4dfbc76181cae997ce98a207))
* resolve 5 open issues ([#413](https://github.com/minhoyoo-iotrust/WAIaaS/issues/413)-[#417](https://github.com/minhoyoo-iotrust/WAIaaS/issues/417)) ([10313e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10313e0accde7ba3ca495fe451364fe67e5be21c))

## [2.12.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0...v2.12.0-rc) (2026-03-19)


### Features

* add debug logging to Action Provider API clients ([#412](https://github.com/minhoyoo-iotrust/WAIaaS/issues/412)) ([9d71a26](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d71a264941d468c141a0a9103b3885db7723a8d))

## [2.11.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.27...v2.11.0) (2026-03-19)


### Bug Fixes

* promote v2.11.0-rc.27 to stable 2.11.0 ([67a3828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/67a3828de6c863a167d34456cc197b6c1387de0a))

## [2.11.0-rc.27](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.26...v2.11.0-rc.27) (2026-03-19)


### Bug Fixes

* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([2af859e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af859eb35c7233a98a77210a34aa578fbe4cded))
* resolve 7 open issues ([#405](https://github.com/minhoyoo-iotrust/WAIaaS/issues/405)-[#411](https://github.com/minhoyoo-iotrust/WAIaaS/issues/411)) from Agent UAT ([8a567e5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8a567e5371fc6b350987ede1944e6581c4d7957d))

## [2.11.0-rc.26](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.25...v2.11.0-rc.26) (2026-03-19)


### Bug Fixes

* pass rpcUrl to Kamino/Drift SDK, accept Pendle array response, and auto-resolve DCent decimals ([0120f1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0120f1baf666e753083428e7b6157505a1a57d4c))
* resolve Kamino/Drift RPC URL, Pendle schema regression, and DCent decimals auto-resolution ([e2e9da3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e2e9da398eece343d23121b223eeb6e82345de92))

## [2.11.0-rc.25](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.24...v2.11.0-rc.25) (2026-03-19)


### Bug Fixes

* add eslint-disable for [@ts-ignore](https://github.com/ts-ignore) on optional SDK imports ([0fbd32b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fbd32b4cd9b1bc819e0733403e8d4bc3fa2d08a))
* pass rpcUrl to Jito provider via registerBuiltInProviders and fix fetch mock reuse ([6b904fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6b904fd2b9ec088ff3ba292f278d063501653429))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi providers, positions, UAT scenarios ([c6c2767](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6c2767b786c08eb8789a58af0df336f78384254))
* resolve issues [#395](https://github.com/minhoyoo-iotrust/WAIaaS/issues/395)-401 — DeFi UAT, Jupiter ALT, Jito accounts, Pendle schema, SDK install, Aave decimals, PositionTracker sync ([c202e4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c202e4eacb9f205871621d93bd4d663b47ea59e9))
* use [@ts-ignore](https://github.com/ts-ignore) for optional SDK imports to support CI without optional deps ([c9a5dd4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9a5dd440f0972142bbc98f7df5cabaf91da2e2c))

## [2.11.0-rc.24](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.23...v2.11.0-rc.24) (2026-03-19)


### Bug Fixes

* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi position tracking, token registry, DCent Swap ([fe09ade](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe09ade08fe61dcd0df29e29442afb37f1668866))
* resolve issues [#391](https://github.com/minhoyoo-iotrust/WAIaaS/issues/391)-394 — DeFi positions, token registry, DCent Swap ([96d0003](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96d00038fb6d2023b212122b448df8e37247341b))

## [2.11.0-rc.23](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.22...v2.11.0-rc.23) (2026-03-19)


### Features

* **453-02:** remove admin/setup skills and update registry/installer ([921a8d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/921a8d4c1d94ca49f08c8d2e9af6f5d85e981fa5))
* **453-02:** remove masterAuth content from all skill files ([97d4ec4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/97d4ec44358a2b3c732ea72503660ee063fc4fda))
* **454-01:** scaffold @waiaas/openclaw-plugin package ([18beaf8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18beaf8b478edd0613f7fafee4823b82fd7964c2))
* **454-02:** implement 17 sessionAuth tools for OpenClaw plugin ([83f0d75](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83f0d75582dd532d07f9b03a7115909ffdf7a741))
* **455-01:** integrate openclaw-plugin into release and publish pipelines ([75860e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/75860e4d298d3272cfd1aa4b57f791eccb113143))
* **455-02:** rewrite openclaw-integration.md + add openclaw-plugin SEO page + rebuild site ([b26d493](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b26d49303f9435e4220b3c02011cc353ea546a12))


### Bug Fixes

* **db:** rebuild wallets table in v60 migration to update CHECK constraint ([7d933f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d933f414502eef8c4c15f53ba5ac667dc9e9b8c))


### Code Refactoring

* **452-01:** rename docs/guides/ to docs/agent-guides/ ([e235d2b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e235d2b2fc332c72652852bb6eb02dd84c3dabcf))

## [2.11.0-rc.22](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.21...v2.11.0-rc.22) (2026-03-18)


### Features

* **449-01:** replace ntfy with push_relay in core schemas ([b396882](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b396882eee0c9b0367b6f1983234d9cb2e208e5d))
* **449-01:** update sign-request-builder to push_relay + fix schema-ddl CHECK ([cfdf198](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cfdf198ac691e7d63da2e1abcb554ac2cf4ad0ef))
* **449-02:** add DB v60 migration for push_relay_url + ntfy cleanup ([5d081e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d081e63392f29e84b9feca4df50f97c00e1c6ac))
* **449-03:** add sign_responses DB store + rewrite sign-response-routes ([8815ccb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8815ccb1b6ef625c3f52624001613ca3d6c15624))
* **449-03:** remove ntfy code from push-relay, add direct push API ([ff16b1f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff16b1ff4741f404abe5ffbf653f4942725fa092))
* **450-01:** replace NtfySigningChannel with PushRelaySigningChannel ([47a35ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/47a35adb5ebd39389608b245b855b85bbfe4a91b))
* **450-01:** update ApprovalChannelRouter and daemon startup for sdk_push ([8ddebcc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ddebcc55cd776d771c62e4d7822d7195af48749))
* **450-02:** rewrite WalletNotificationChannel to use Push Relay HTTP POST ([34bef0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34bef0dc308ade802abeadbe1110a781dbb5cbb1))
* **451-01:** add push_relay_url to WalletApp API and fix notification channel ([095eec9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/095eec91b86e505aeead960818923ae563c16189))
* **451-01:** deprecate SDK ntfy channel functions ([2af5fb4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af5fb4ca5d08dde97533f26b92bab8ee4bc7883))
* **451-02:** update Admin UI human-wallet-apps from ntfy to Push Relay ([03e1fec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03e1fec05285be7f7d3cace316c7794349d5405f))
* **451-02:** update wallets.tsx approval method labels from ntfy to Push ([77e9f0b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/77e9f0b96a9d54539abc948c8b0f263fd79cd0df))
* add Env column and --env filter to Agent UAT scenarios ([4c03900](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c03900fd9eea20cfae99f5f196305d92969d0e4))


### Bug Fixes

* **450-01:** update remaining ntfy references in SDK tests and preset-auto-setup ([efae3ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/efae3ff1b1fe8d5317af6f0c5bf37508e9ec55c9))
* correct DCent Swap UAT scenario API endpoints and amounts ([2a53b47](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a53b47980ffea7959cb2c74b0b06317fdd5c2bc))
* correct Lido testnet contract addresses from Holesky to Sepolia ([73ef0c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/73ef0c3432e018e82322b60dbe378bece158982e))
* include error details in Telegram Bot retry warning logs ([99b1002](https://github.com/minhoyoo-iotrust/WAIaaS/commit/99b10026e45f9f7744b4e1465817414f9062ab67))
* remove duplicate H1 title on SEO pages ([ae3ba56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae3ba5659cb980ef4b1befb96ed9bc7a3d5c4b55))
* remove formatAmount() from DCent Swap API calls ([646366f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/646366fde152657bc5b553e191e9ecaca76ea165))
* remove ntfy channel status from admin-notifications API ([be542b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/be542b0de98bac461ec2e6c6fc3e5df35f5a174c))
* remove obsolete cancelTopicEdit test for removed feature ([6875180](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68751803a293c5c7f639f6d9f825233d4b7f31a4))
* remove stale ntfy references from tests and admin UI ([19529b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19529b73dc9a987c5f42af1b05af50dddc57910f))
* resolve lint errors in push-relay-signing-channel and signing-sdk-e2e test ([9fbc3bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fbc3bb3ac49d333e300e36508e02d39cf93dd0d))

## [2.11.0-rc.21](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.20...v2.11.0-rc.21) (2026-03-18)


### Features

* **439-01:** add CRT-themed article CSS for long-form content ([181e681](https://github.com/minhoyoo-iotrust/WAIaaS/commit/181e6813b182b97750097c7026e8be70cb87176c))
* **439-01:** add markdown-to-HTML build script and template ([17b6d39](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17b6d39e30d279a12b7ce930c0bc8cebd56cabec))
* **440-01:** add Blog/Docs listing pages and navigation integration ([f31a32b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f31a32b6072efc30e591a53bb34668cac364e1dc))
* **440-01:** add internal link validation and content stats to build ([3df91b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3df91b0f0d95e84f4018ae0758107911f8481553))
* **441-01:** add auto-generated sitemap.xml and JSON-LD structured data ([40bacff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/40bacff2fa8e4b1e80e648be854d2d706fc46131))
* **441-02:** add llms-full.txt auto-generation and pillar-cluster internal links ([07a6401](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07a64013538cb600fa2e374c63fd3fdbd3e3cbac))
* **441-02:** expand FAQ to 20 Q&As with visual accordion section ([74436e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/74436e4b1a066cf292d9224d9292cd23ee17ba85))
* **443-01:** add 3 SEO landing pages for AI wallet category keywords ([a87c64b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a87c64bc9a62fe45e4c1ee27b8efde8e63635b90))
* add DeFi position exit and DCent Swap extended UAT scenarios ([016b160](https://github.com/minhoyoo-iotrust/WAIaaS/commit/016b160e273890f0d0a6130f17095aaea222e433))


### Bug Fixes

* add GET /policies/:id route and fix unused import lint errors ([b28c5b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b28c5b5f47a98057365e87ea68fd07151d410eef))
* align SDK test assertions with actual URL query values ([4a279b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4a279b4d1511fc2406224e21d05a431196d64861))
* normalize EVM token addresses with EIP-55 checksum validation ([d0d7229](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0d72295f143a06be779f9c42d59fad8f63e60de)), closes [#379](https://github.com/minhoyoo-iotrust/WAIaaS/issues/379)
* resolve PositionTracker RPC URLs via RpcPool for DeFi dashboard ([62539c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62539c79117af45c76f090d5a0954bdb3ced8aab)), closes [#380](https://github.com/minhoyoo-iotrust/WAIaaS/issues/380)
* resolve type errors in SDK client-coverage test ([7740848](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7740848448635b7875e11e03a7ed1ecb10560af2))
* resolve unused variable and empty block lint errors in CLI tests ([0b9c23c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0b9c23cedc89405f2de4fb7064d169dcfb1ed0fe))

## [2.11.0-rc.20](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.19...v2.11.0-rc.20) (2026-03-17)


### Features

* **436-01:** add pagination to sessions and policies list APIs ([b5bd519](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b5bd519abedae723d204c81d6f1b8f31d3005a46))
* **436-02:** add SDK listSessions/listPolicies and MCP list_sessions tool ([bf405e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf405e14729327dbd6e6634820471bc57bff3292))
* **438-02:** add ILogger interface + ConsoleLogger in @waiaas/core ([e5d61e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e5d61e685478e3cf4ea424ab81594fdc2939a101))
* **438-02:** centralize Solana adapter error handling with mapError() ([5316a64](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5316a64363af280dae98cf5b9d2dd79635e86fa0))


### Bug Fixes

* **436-01:** update session list assertions for paginated response format ([bd9c37b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd9c37b02a3c4c784f82915a12160e589784c552))
* **436-02:** fix TypeScript strict null assertions in SDK pagination tests ([3e1dd11](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e1dd118b51065da6aad10f795a45cb10ed166d1))
* **436-02:** update MCP server tool count to 42 after list_sessions addition ([fc53fdb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc53fdb56a295dfe93ea92643eb38869a30c5ebe))
* **436:** update E2E test assertions for paginated session/policy responses ([fefbb73](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fefbb73101966d08224456341ef387c59633e1bc))


### Code Refactoring

* **435-01:** batch queries in admin-monitoring agent-prompt ([777593d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/777593d735d4b4f0e225de975c331df45ed9bfbf))
* **435-01:** batch session wallet queries in sessions.ts ([0d3db8b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d3db8b459f2f19721a7dd702da5f84e9f5f777a))
* **435-02:** add tokenMap parameter to formatTxAmount and batch helper ([be066e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/be066e1c5e224963ac602d7364bd1173cd75ebec))
* **435-02:** update remaining call sites to use batch tokenMap ([0170429](https://github.com/minhoyoo-iotrust/WAIaaS/commit/017042956aa5f3eb498368c9ebfba24d6a5d2a9d))
* **437-01:** split migrate.ts into schema-ddl + 6 migration modules ([fcf3ccf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fcf3ccfac5982b07007b7d757696872c1bef2c59))
* **437-02:** replace all inline import() types with static import type in daemon.ts ([07c4702](https://github.com/minhoyoo-iotrust/WAIaaS/commit/07c47025da12bc8997303a1d547535867e57211d))
* **437-02:** split daemon.ts into startup/shutdown/pipeline modules ([d5e2fff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5e2fffc9c37e703c1f5550e527d3e540627b00f))
* **437-03:** split database-policy-engine.ts into 6 evaluator modules ([092b0e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/092b0e411316227aa1adad4f4aa24e9be829fb7e))
* **438-01:** split stages.ts into 6 stage files + pipeline-helpers + barrel re-export ([06f92e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/06f92e1ba4aa8bcc580f8ea2ce0b423a103ade94))

## [2.11.0-rc.19](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.18...v2.11.0-rc.19) (2026-03-16)


### Features

* **432-01:** define PositionQueryContext type and update IPositionProvider signature ([80875dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/80875dc080cd9392bdd0e01bbd50a55eeb810794))
* **432-01:** update PositionTracker.syncCategory to build PositionQueryContext ([425dd14](https://github.com/minhoyoo-iotrust/WAIaaS/commit/425dd14978c9b8c84ace3dfce14632af1e8df9fc))
* **432-02:** migrate 3 Solana providers to PositionQueryContext + fix core re-export ([618a3f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/618a3f65ba0ff58dcdcf15fb5b2bed322a0d8fd3))
* **432-02:** migrate 5 EVM providers to PositionQueryContext with chain guards ([72c36c4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/72c36c46b97e90fe7fe0434915a70ea21b2c34ce))
* **433-01:** Lido multichain contract mapping + 5-network parallel positions ([7d36218](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d362189cf13ada9db816e072c0ce614e702d1d1))
* **433-02:** Aave V3 multinetwork getPositions + Promise.allSettled ([46e0633](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46e063337a14f50569f79d3c18124c9813bd3d27))
* **433-03:** Pendle multinetwork getPositions (Ethereum + Arbitrum) ([d91aa22](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d91aa22bdd8fb7ab8751601c94c26c3a55b55c9f))
* **433-04:** Solana providers use ctx.networks dynamic extraction ([8e3fadb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8e3fadbe3b89c5cc6b5d3a3fb4185fbeb2a570c1))
* **434-01:** add environment column to defi_positions (migration v59) ([e80b395](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e80b39504f140499b5638c35c8c6859a417faf6b))
* **434-01:** add includeTestnets filter to admin defi positions API ([cc5f156](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cc5f156a1e21a8634dd4007cb1110b6e3b54fb3e))
* **434-02:** add Include testnets toggle to Admin DeFi dashboard ([552e879](https://github.com/minhoyoo-iotrust/WAIaaS/commit/552e879560313712c126b4f139f1409f8ffab595))
* implement real SDK wrappers for Kamino and Drift ([#374](https://github.com/minhoyoo-iotrust/WAIaaS/issues/374), [#375](https://github.com/minhoyoo-iotrust/WAIaaS/issues/375)) ([a14e052](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a14e0522f948c1853908b395b2d02386ef3e5721))


### Bug Fixes

* **433:** resolve typecheck errors in Lido and Aave test files ([1af4f58](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1af4f586026221eed284d7f1cf64539cdee75881))
* add eslint-disable for [@ts-ignore](https://github.com/ts-ignore) on optional SDK dynamic imports ([ee04743](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ee04743c3098224ec66e0101f3a38b1be2b3e82e))
* remove unused [@ts-expect-error](https://github.com/ts-expect-error) directives for SDK imports ([144f6eb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/144f6ebfa0b50b7da20d8ff2055020d34e495dac))
* reorganize UAT scenarios — add admin-ops category, remove WalletConnect ([#377](https://github.com/minhoyoo-iotrust/WAIaaS/issues/377), [#378](https://github.com/minhoyoo-iotrust/WAIaaS/issues/378)) ([cbb484d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cbb484da5b799ef9355b3d8acceb968e2696557c))
* resolve issues [#367](https://github.com/minhoyoo-iotrust/WAIaaS/issues/367)-[#373](https://github.com/minhoyoo-iotrust/WAIaaS/issues/373) — DeFi provider bugs + Admin DX improvements ([970dea4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/970dea4d816d9c256afea8d4a508d34fc7dc9548))
* resolve typecheck errors in new test files ([186c21e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/186c21e7457686e7b16bbc86d62757ed994ebee9))
* revert lockfile and remove optional SDK deps from package.json ([8d05cf5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d05cf52d5fb22e2146958e318d33dfd5fae9722))
* update daemon tests for schema v59 migration ([2af1a0f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2af1a0f65c6aaeb7969b331cbfbad4d9f081918b))
* update E2E wallet-purge policy creation to current schema ([#376](https://github.com/minhoyoo-iotrust/WAIaaS/issues/376)) ([2c017fa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2c017fac2898e20d300b630915327707312f588d))
* update migration-runner tests for schema v59 ([106c511](https://github.com/minhoyoo-iotrust/WAIaaS/commit/106c5116d929ed4305fbff9ee3ae0191a3340315))
* update Pendle test makeCtx() to provide rpcUrls for getPositions ([37909c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/37909c7e3bf9b915f9353615643c72347baf8ad9))
* update pnpm-lock.yaml for Kamino/Drift SDK dependencies ([401b062](https://github.com/minhoyoo-iotrust/WAIaaS/commit/401b062e8c86e1f6699d2f9585eae5646f5352ab))
* use [@ts-ignore](https://github.com/ts-ignore) for SDK dynamic imports to handle cross-env type resolution ([d1e6149](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1e6149a0fc1e5d5fd54aa8b0ce6e38b360c1596))

## [2.11.0-rc.18](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.17...v2.11.0-rc.18) (2026-03-16)


### Features

* **427-01:** add safeJsonParse helper, export POLICY_RULES_SCHEMAS, register error codes ([88d35bc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88d35bc900f422b2634008e81ce32f02b812a46b))
* **427-01:** consolidate sleep() to @waiaas/core SSoT, remove 5 local duplicates ([92f45b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92f45b0d41fd7f54e405d8bd113ea083ec0a4011))
* **428-01:** extend IChainSubscriber with pollAll, checkFinalized, getBlockNumber ([7c6f053](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c6f053d29b0be532b403d985ae472b4e83351a6))
* **429-01:** add 7 Zod rule schemas + POLICY_RULES_CORRUPT error code ([5087604](https://github.com/minhoyoo-iotrust/WAIaaS/commit/50876045338c7efad91da47ee8079133b2c83a1c))
* **429-02:** replace JSON.parse with safeJsonParse in DatabasePolicyEngine ([d2ee31c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d2ee31cb930c00c191aa8b2ae4cd5cf15d546a92))
* **430-01:** add Zod validation to JSON.parse in daemon, notification, JWT secret ([c00c125](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c00c125e7c6c1c848331629d4462e7752c127c34))
* **431-01:** NATIVE_DECIMALS/NATIVE_SYMBOLS SSoT + formatAmount integration ([6461ae7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6461ae7c5302ec4e9633c2e91d15eab718dca5bf))
* **431-01:** resolveRpcUrl typed overload removes as unknown as Record casts ([8acc270](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8acc2704d76b871b50d7e05096e5812857d4b9cb))
* rename Trading sidebar section to Protocols and move Agent Identity ([#360](https://github.com/minhoyoo-iotrust/WAIaaS/issues/360)) ([0d69e50](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d69e5058f90c59ed269a49730eb20e86c52aeec))


### Bug Fixes

* **428-01:** remove as unknown as castings from incoming TX monitor pipeline ([e7b468d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7b468db5117cf2f735326d75231270a5fee6367))
* **428-02:** replace ACTION_VALIDATION_FAILED misuse with VALIDATION_FAILED for Zod parse errors ([82e7ab2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/82e7ab2c3f1df58b1c63cc044694fd36114b9337))
* **430-01:** remove as any from wc.ts, daemon.ts, wc-session-service.ts, signing files ([19c92f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19c92f58affcf219c64f8ea1f1b32bc69b573545))
* **430-02:** remove as any from hot-reload.ts and sync-pipeline.ts ([8e6eab2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8e6eab22c23086d589f7e5b633663e80ce9a4453))
* **430-02:** remove as any from stages.ts and userop.ts bundlerClient/publicClient ([6220493](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6220493f1ed1f7f72cc33b8ef1a0ccf7b6d0b040))
* **430-03:** fix pre-existing type error in integration-wiring test mock ([2f8024e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2f8024e4c03b7db32a1d1de9b852128ce10cf151))
* **430-03:** remove as any from external-action-pipeline, actions, admin-actions, registry ([f603c5a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f603c5a59cebb33dc9a29d44b0e293d6c82b52ba))
* **430-03:** replace network as any with NetworkType assertion across API routes and NFT indexers ([efb4470](https://github.com/minhoyoo-iotrust/WAIaaS/commit/efb44706dcae77afd0507b1debd28c13cd21ba94))
* add API-level empty array validation in CreatePolicyRequestSchema superRefine ([65a3341](https://github.com/minhoyoo-iotrust/WAIaaS/commit/65a334152def79b7363ee1ffacf5f69fbd35bdc8))
* deduplicate getBlockNumber calls per network in EvmIncomingSubscriber ([#359](https://github.com/minhoyoo-iotrust/WAIaaS/issues/359)) ([341c2ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/341c2ac4a8c2f85b60cd480dd698cd8f8821c410))
* include NFT indexer keys in api-keys endpoint and align Helius key name ([#361](https://github.com/minhoyoo-iotrust/WAIaaS/issues/361)) ([7ab9030](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7ab9030490452f736f782cc6e6b8be970690df91))
* relax Zod schema min(1) constraints for policy rule arrays ([95e47ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95e47ff9d63f00047a337dc7a198efbbda9d41e4))
* remove unused SOLANA_PUBLIC_KEY lint error in sign-message tests ([b033c71](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b033c71bb6f9fb26882c9f95987c509d6003756c))
* update test expectations for v32.4 Zod validation and error code changes ([76b8603](https://github.com/minhoyoo-iotrust/WAIaaS/commit/76b8603b02abc63d6aa10c141e7a31e6d04f52f2))


### Code Refactoring

* **428-02:** move verifySIWE, decodeBase58, MasterPasswordRef to infrastructure/auth/ ([d4bcd37](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4bcd377a493b6b8c92a66f34c471a171356042d))
* **431-02:** extract aggregateStakingBalance shared utility + sync display-currency ([7b3c9c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7b3c9c70b5843389be725c0961ba391039b428c6))
* **431-02:** sweepAll optional + stageGasCondition rename + hintedTokens encapsulation ([f48d8a6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f48d8a6c8161635064c8bc618653c05175ad7ec1))
* remove duplicate protocol toggles from protocol pages ([#362](https://github.com/minhoyoo-iotrust/WAIaaS/issues/362)) ([9febc36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9febc362c6af0368e211210ad0937eb1aad0a377))

## [2.11.0-rc.17](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.16...v2.11.0-rc.17) (2026-03-16)


### Bug Fixes

* register cors_origins setting key and fix array serialization ([9c3b659](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9c3b659ddd459c894c456982c800a5b83ce66c68))

## [2.11.0-rc.16](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.15...v2.11.0-rc.16) (2026-03-16)


### Bug Fixes

* exclude CLI e2e/platform tests from test:unit ([712d49c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/712d49c0ef37c6cd9d583cbdf52e690dc4e02066))
* increase CLI e2e health check timeout to 30s for CI ([7907892](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7907892362b97f9fb86e77edda27ac1c65c9675e))
* lower CLI branches coverage threshold to 78% after e2e exclusion ([b53f66a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b53f66a1f6d6a2be46fe8bd795fd338b110c5229))

## [2.11.0-rc.15](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.14...v2.11.0-rc.15) (2026-03-15)


### Features

* **424-01:** generalize SSRF guard + fix hostGuard exact matching ([b3f6747](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3f674763f2ab4f5a544e7d0380a8c835006b232))
* **425-01:** add RATE_LIMITED error code + SlidingWindowRateLimiter + 3-tier middleware ([7d82144](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d8214489d646f7c1f8f8f43597a05920f3ea7b3))
* **425-01:** register 3-tier rate limit middleware in createApp() ([073cbc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/073cbc13827caa2dd2a0e1c4893d5e0cd4d9f9ee))
* **426-01:** add CORS middleware, notification timeouts, AutoStop listener cleanup ([77de07f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/77de07f78a5fb567c41cb8c8d9e255c9f49aac0d))


### Bug Fixes

* **425-01:** update error code count in core tests for RATE_LIMITED ([589e610](https://github.com/minhoyoo-iotrust/WAIaaS/commit/589e6103568c9d0483e95cb32d9d4a9d79605e8b))
* add missing hyperliquid_request_timeout_ms setting key ([99bba30](https://github.com/minhoyoo-iotrust/WAIaaS/commit/99bba301585a123d4f08043af7bd999d8d543f97))
* resolve open issues [#353](https://github.com/minhoyoo-iotrust/WAIaaS/issues/353)-[#358](https://github.com/minhoyoo-iotrust/WAIaaS/issues/358) ([62d27c2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62d27c218d7422b83f784c1b1fa1d7e2df01b2b5))
* resolve open issues [#353](https://github.com/minhoyoo-iotrust/WAIaaS/issues/353)-[#358](https://github.com/minhoyoo-iotrust/WAIaaS/issues/358) — CI badge, Admin UI improvements ([b2dc8b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b2dc8b24a7714d0d957696275f7cb25da67f2cf6))
* stub settingsService methods in extract-openapi to prevent 500 ([d183e17](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d183e17eeae1e95c1e08c89b4e7e07d5f0bee4b8))

## [2.11.0-rc.14](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.13...v2.11.0-rc.14) (2026-03-15)


### Features

* **421-01:** add displayName to all 17 Action Providers ([ea5d1de](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ea5d1de18920c3c97c2e4f36d42f41e18d89bdb9))
* **421-01:** add well-known contracts data and ActionProvider displayName ([c79f596](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c79f596499ec7584c88a95ba8db841416280695e))
* **421-02:** implement ContractNameRegistry 4-tier resolution service ([56cdda9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/56cdda9285fa9b63e23a574f1d79712acfeb85b5))
* **422-01:** wire ContractNameRegistry into pipeline notifications ([8065399](https://github.com/minhoyoo-iotrust/WAIaaS/commit/806539919ed6d00aa2e0c8d2502077e7c559ede7))
* **423-01:** add contractName/contractNameSource to transaction API responses ([04ab0fa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04ab0faea30beda38b78b5d357cd539d817fb97b))
* **423-01:** display contract names in Admin UI transaction views ([e753280](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e75328059fcac37806f73f561557d41cf064b319))


### Bug Fixes

* **422-01:** resolve typecheck errors from unused variables and missing interface ([7369329](https://github.com/minhoyoo-iotrust/WAIaaS/commit/73693290663c0d164453172191bd344a4c975220))
* add missing required fields to ActionProviderMetadata test mocks ([96ac78d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96ac78d8c2e7110bbafe2ea3c3163ce95e05454a))
* remove unused type imports in contract name test files ([396b112](https://github.com/minhoyoo-iotrust/WAIaaS/commit/396b11240b2e47f89f1ecc7d367f9920db4172f5))
* update notification test to include {to} variable in TX_CONFIRMED template ([581c417](https://github.com/minhoyoo-iotrust/WAIaaS/commit/581c417ed16e6da4dbf8229420feb9b0a42eaddb))

## [2.11.0-rc.13](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.12...v2.11.0-rc.13) (2026-03-15)


### Bug Fixes

* **ci:** bypass Turborepo entirely in chain-integration job ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([41b563f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/41b563f537cdf76cec80654e725abcee99275ab1))
* **ci:** exclude admin package from chain-integration build ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([303b056](https://github.com/minhoyoo-iotrust/WAIaaS/commit/303b056b18a76f37130e34e3f6716dc296494f4d))
* **ci:** isolate background process fd to prevent Turborepo I/O error ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([c1b2489](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1b24899599c0beebb82d45a16309237474a9111))
* **ci:** use pnpm -r instead of turbo for chain-integration build ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([238dced](https://github.com/minhoyoo-iotrust/WAIaaS/commit/238dcedb8b2d6bfc6f2ba7244e7fca70eeed68de))

## [2.11.0-rc.12](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.11...v2.11.0-rc.12) (2026-03-15)


### Bug Fixes

* **ci:** use --no-daemon flag for Turborepo in chain-integration ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([da2ea1c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/da2ea1c00b266e22877c28acc50f043da8e6e8fd))
* **ci:** use --no-daemon flag for Turborepo in chain-integration ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([7ca1b84](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7ca1b841a35138a199d06602eb0e66b1b7aa4537))

## [2.11.0-rc.11](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.10...v2.11.0-rc.11) (2026-03-15)


### Bug Fixes

* **ci:** use --daemon=false CLI flag for Turborepo in chain-integration ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([22fc3f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/22fc3f00ed024b14a0f22c3ac9b28fa0c550373a))
* **ci:** use --daemon=false CLI flag for Turborepo in chain-integration ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([fb0d81b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fb0d81be40e5c641a2d3af6f50c097273896d79b))

## [2.11.0-rc.10](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.9...v2.11.0-rc.10) (2026-03-15)


### Features

* **417-01:** convert sidebar to sectioned NAV_SECTIONS with renaming and route redirects ([175bc66](https://github.com/minhoyoo-iotrust/WAIaaS/commit/175bc66d80cb681850781afb67dd4207d3b24535))
* **417-01:** update Ctrl+K search index and PAGE_LABELS for renamed routes ([817aca1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/817aca11140d8557b4f8d53855faa143e9f08b5f))
* **417-02:** rename tab labels -- Transactions to History, Policies to Rules ([cc2139f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cc2139f1c1b92f0d712fb5855d9a66ce1bc04adb))
* **417-02:** replace custom tab bars with TabNav in Hyperliquid and Polymarket pages ([ed2c14e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ed2c14ef5944f92c4d90b4ed6cb01d8e0b07f564))
* **418-01:** merge Tokens into Wallets page as tab ([3cd2b24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3cd2b24b30b12bc5e3a8d85a0f7a8d527d832fc0))
* **418-01:** redirect /tokens to Wallets page Tokens tab ([b1152ea](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b1152ea948fcca79aad093541f1d69fb5255b0ba))
* **418-02:** add Settings 3-tab layout with RPC Proxy tab ([3aed26d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3aed26d8e35a92a905ea8de23f887309b576887d))
* **418-02:** legacy cleanup + /rpc-proxy redirect + skill file update ([7456f97](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7456f9707c61180fb55401dbda298c61360908ca))
* **419-01:** remove Settings tab from Hyperliquid/Polymarket + migrate to Providers ([e762b88](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e762b881b1e82ec2583132367345fa613b4ea6f3))
* **420-01:** redefine DETAIL_TABS to 4-tab structure + Owner Protection card ([e33d461](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e33d461aec9969d9eb4e4a74bfbe2ab6dfe80fad))
* **420-02:** implement ActivityTab/AssetsTab/SetupTab with content integration ([d8aefe1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8aefe1328e8043a6d1e4fcba4726cd5ca5fc045))


### Bug Fixes

* **417-01:** update tests for renamed routes and page titles ([ffbd403](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ffbd403a66af3e6f614669b3d9d5434b67b9b6e4))
* **ci:** disable Turborepo daemon in chain-integration job ([#352](https://github.com/minhoyoo-iotrust/WAIaaS/issues/352)) ([5e5205a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5e5205a88815d6f08087a82531e1b2f11aaf54af))

## [2.11.0-rc.9](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.8...v2.11.0-rc.9) (2026-03-15)


### Features

* **412-01:** add OpenAPI spec extraction script with full stub deps ([7f4e319](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f4e319d457c78d2308187d48c74eac4261fb21b))
* **412-01:** add type generation pipeline with generate:api-types command ([1bbb73a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1bbb73a8603d529ae7f93272c64e4e85226820f2))
* **412-02:** add CI freshness gate for types.generated.ts ([de1c0d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/de1c0d10d6f87edba00514188498bf9400915bd2))
* **413-01:** add openapi-fetch typed client with auth middleware ([57ac3ca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/57ac3ca46ce908912080d20acc0b0e035b374550))
* **413-02:** migrate dashboard.tsx to typed client and generated types ([4f7d2d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f7d2d435fb34308a4be0b01fa565ebf7da150e8))
* **413-02:** update dashboard test mocks with satisfies generated types ([a223c82](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a223c8252e0e7497e0515605b64549b8146778fe))
* **414-01:** create central type aliases module and migrate settings-helpers ([52e3910](https://github.com/minhoyoo-iotrust/WAIaaS/commit/52e39109dfdefc049d2c7c9c69c2c8771edc6996))
* **414-01:** migrate 8 small pages and tests to typed client ([13e6d9d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/13e6d9da9cfe75d4fecec3b089c46e424330e85b))
* **414-02:** migrate 9 medium pages to typed client ([561ae02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/561ae020256d1e8047ace5a1b5417f1846b90bbd))
* **414-03:** migrate SettingsPanel + PolymarketSettings to typed client ([bd386bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd386bb04af51e3b6633819d3e8b095f49cb54bd))
* **414-03:** migrate wallets.tsx to typed client with generated types ([16b0d98](https://github.com/minhoyoo-iotrust/WAIaaS/commit/16b0d98ed6fef9d6bb8837e7dc22e5fda991d5b2))
* **415-01:** add GET /v1/admin/settings/schema endpoint with metadata ([11505e2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/11505e2f00c402496b23aae3c6314c9d18a81721))
* **415-01:** enhance GET /v1/actions/providers with enabledKey, category, isEnabled ([d616b52](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d616b522771300933b4fe5888ba1ff783b1997a8))
* **415-02:** add shared constants module for policy, credential, and error constants ([eadff06](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eadff06626ff8d3358d8a2412d9134c69c6229a2))
* **415-03:** replace BUILTIN_PROVIDERS with API-driven provider listing ([800faf5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/800faf5a2b8fb4faa0e806739633057d8b161d2c))
* **415-03:** replace hardcoded constants with @waiaas/shared imports ([01b610c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/01b610c8e5dd9b238b31f89356a357a547c7d734))
* **416-01:** add API contract test script and vitest tests ([36a1d9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/36a1d9f42076fa94b751cff829fc12bb0003177d))
* add UAT report persistence with privacy masking ([#351](https://github.com/minhoyoo-iotrust/WAIaaS/issues/351)) ([d7e12da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d7e12da7876286787a22695a8d9bab4a30959868))
* **admin:** wire settings schema API to replace hardcoded keyToLabel map ([ca9f352](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca9f352771eb65403f21cd0841e8f519bb23db3c))


### Bug Fixes

* add all daemon workspace deps to generate:api-types task ([145a104](https://github.com/minhoyoo-iotrust/WAIaaS/commit/145a1046f1ddbb255e547ed9cfddf2aab2a97f23))
* add core/shared build deps to generate:api-types turbo task ([f0c310a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f0c310af3dcbb890f20f9ec822dd0c26b86ca6c4))
* **admin:** update 19 test files for typed-client mock patterns ([6aacffd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6aacffd10663d8341e4c65e052d431080ad83215))
* credential list API response wrapper + pnpm-lock sync ([#349](https://github.com/minhoyoo-iotrust/WAIaaS/issues/349), [#350](https://github.com/minhoyoo-iotrust/WAIaaS/issues/350)) ([71a363e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71a363e228fa8df64e804cc6814caac4c55f8946))
* handle unknown setting keys in provider listing gracefully ([1ea6ef4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ea6ef40843fa8eff4788b7189fdcf6aa2304147))
* remove unused vitest imports in admin-settings-schema test ([3e58ad9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e58ad97faac2ceb3b35e22b6ec42ff9af657bd5))

## [2.11.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.7...v2.11.0-rc.8) (2026-03-14)


### Features

* **407-01:** extend normalizeNetworkInput with CAIP-2 dual-accept ([8787199](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8787199bc9dd8da00f714ae595699cca1205adad))
* **408-01:** add CAIP-19 asset resolve utility with parseAssetId + extractNetworkFromAssetId ([7b60798](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7b607988ecfbc98df078750df43b5bcdd8474a74))
* **408-01:** extend TokenInfo schema with assetId-only mode (superRefine cross-field) ([b670341](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b6703410bbc35d2ef95ca0edea77ac617689e424))
* **408-02:** add resolveTokenFromAssetId middleware for registry resolve + network inference ([37194f8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/37194f82aea4309b1c765efee7ed3c25c9831d7d))
* **408-02:** integrate resolveTokenFromAssetId into transaction routes ([777a7fe](https://github.com/minhoyoo-iotrust/WAIaaS/commit/777a7fefe32d91ac5838a784138ede5203cb20f7))
* **409-01:** add CAIP response enrichment utilities ([a33c83f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a33c83f08e103986c529b0bfd0245a13e559089d))
* **409-01:** add supportedChainIds to connect-info + OpenAPI schema CAIP fields ([4e73419](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e734192b61dadf4fbc8e23200474a4e36973dc7))
* **409-02:** apply CAIP enrichment to all response endpoints ([194ba72](https://github.com/minhoyoo-iotrust/WAIaaS/commit/194ba72fa72b0a08fb5d08fd2cf4c0f3ce7f4c3f))
* **410-01:** add CAIP type aliases and extend SDK response types ([fa0108e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fa0108e0b9fafe1abf42f20e8668544528af3594))
* **410-01:** allow assetId-only TokenInfo in SDK validation ([59f84c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/59f84c8ff356f741d6f21911e3c9a7800ef4ba8c))
* **410-02:** add resolve_asset MCP tool for CAIP-19 metadata lookup ([0d5f4aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d5f4aa6afc569bff3c1c85b0a004f8fa138dfa4))
* **410-02:** enable assetId-only token in MCP tools and add CAIP-2 to network descriptions ([f8a992a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f8a992a894de196e071b13a7a48d5d7d823f3121))


### Bug Fixes

* remove unused beforeEach import in resolve-asset test ([cf27b16](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cf27b167994a18685ce628184176df1e206848a0))

## [2.11.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.6...v2.11.0-rc.7) (2026-03-14)


### Features

* **admin:** apply WAIaaS terminal dark theme to Admin UI ([14d9379](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14d93794eae64c8fcad49bc77e21098d6fac84f8)), closes [#345](https://github.com/minhoyoo-iotrust/WAIaaS/issues/345)
* **admin:** WAIaaS terminal dark theme + UI bug fixes ([b76c81c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b76c81c9cc09c17df3fa0d53113356f6cc402ad1))


### Bug Fixes

* **admin:** resolve login button readability, danger button style, and stale DOM on route change ([f897e9d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f897e9df11c21afcce30191675aff6f2c2a893d4))

## [2.11.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.5...v2.11.0-rc.6) (2026-03-14)


### Features

* **402-01:** add unit description to all provider schema amount fields ([b1869b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b1869b78c81c8fbbea6e19657fd81a03681b01e4))
* **402-01:** harden MCP builtin tool amount descriptions with unit info ([e0eb5db](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0eb5db939933e784f6cf38f0e773823dc66f0fc))
* **403-01:** add migrateAmount() shared helper for backward-compatible unit migration ([fee9a52](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fee9a5207929065c083f43493c80b064b9361b70))
* **403-01:** migrate Aave V3 provider to smallest-unit input with migrateAmount() ([1af3761](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1af37611a7c28b39d56d4b45b80854dc7823d171))
* **403-02:** migrate Kamino provider to smallest-unit input with migrateAmount() ([0d522d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d522d2e9e6c0bf369001a1cc5524b9adbf97237))
* **403-02:** migrate Lido + Jito providers to smallest-unit input with migrateAmount() ([dd26791](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dd26791a9e6ad3cb2e4d023143cd731ba814e0dc))
* **404-01:** add inputSchema JSON Schema to GET /v1/actions/providers ([b18af24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b18af2427c0e9d0ee7e8f7857dd58f49ec978019))
* **404-01:** add typed MCP schema registration with jsonSchemaToZodParams ([08fde1e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/08fde1eb5206f05be1513a5e026755c059cfcc38))
* **404-02:** add amountFormatted/decimals/symbol to transaction responses ([cad87cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cad87cc1044219ca909af7f09c4c620a38660858))
* **404-02:** add balanceFormatted to balance and assets responses ([1b7631e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1b7631ee59c78e09cbd43a0e3f3e1d851333bbdd))
* **405-01:** add humanAmount XOR parameter for TRANSFER/TOKEN_TRANSFER/APPROVE ([b0a264e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0a264ee08cf164b26cb0c5a5a825f5a585aeca1))
* **405-02:** add humanAmount to 10 action provider schemas ([89f6c64](https://github.com/minhoyoo-iotrust/WAIaaS/commit/89f6c64d76e9f5043782e327a4cfa99c2230ce52))
* **406-01:** add SDK humanAmount type and XOR pre-validation ([4353113](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4353113edddafe0ce00d31336bf21b2dd757c3b9))
* **site:** add canonical, keywords, FAQ and HowTo JSON-LD for SEO/AEO ([58a0acf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/58a0acfca6599472ed3ff631708b81c4049eb544))


### Bug Fixes

* **403-providers:** add zero-amount validation after migrateAmount() ([5d0d810](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d0d81040c62476049fa07a14a4b8b052d14545a))
* **404-mcp:** resolve 10 typecheck errors in MCP package ([d8bf6f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8bf6f15eccf49596f6ac34bfa313b439f55b043))
* **actions:** pass required constructor args in CLOB humanAmount tests ([dafbe06](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dafbe063384406107dede4b36c3032f988bc388b))

## [2.11.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.4...v2.11.0-rc.5) (2026-03-14)


### Features

* add favicon with green terminal prompt icon ([a29327a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a29327ac46faad575a2f04db4ddbb38e1550a173))
* restore CNAME for waiaas.ai custom domain ([907e3b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/907e3b25fd9c44fc24780314e917b5b629246a28))


### Bug Fixes

* add og:image:type and alt meta tags for Twitter/X card preview ([96f746d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96f746d40932b25d94989b0d6ff7783377ceb731))
* add og:image:type and alt meta tags for Twitter/X card preview ([1256475](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12564757f28473795c115366a1cb96bf8a5c9678))
* GitHub Pages improvements — agent guide, card alignment, OG image, favicon ([f0a2278](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f0a2278c150857a4110bfdb063fcc6dac63f2490))
* resolve GitHub Pages issues [#341](https://github.com/minhoyoo-iotrust/WAIaaS/issues/341)-[#343](https://github.com/minhoyoo-iotrust/WAIaaS/issues/343) — agent guide tabs, card alignment, OG image ([36da66f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/36da66fe8645327da959e9e611fafe69ad2dbcae))
* restore site/CNAME for GitHub Pages custom domain ([6233cc5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6233cc5f06098c2f636766a66b32d34e94bc8a69))

## [2.11.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.3...v2.11.0-rc.4) (2026-03-14)


### Features

* GitHub Pages terminal theme + architecture redesign ([#339](https://github.com/minhoyoo-iotrust/WAIaaS/issues/339), [#340](https://github.com/minhoyoo-iotrust/WAIaaS/issues/340)) ([b4692d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4692d47c700193289f7038df61f5cef2da24484))
* redesign architecture diagram with accurate structure + remove CNAME ([4798aee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4798aee8ac29299de5f2f939fba65e4f4f19db9e))
* terminal theme redesign + domain unification ([#339](https://github.com/minhoyoo-iotrust/WAIaaS/issues/339), [#340](https://github.com/minhoyoo-iotrust/WAIaaS/issues/340)) ([b248f10](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b248f1016dd9c8d439d51f0d4fa3e1518cabe4fd))

## [2.11.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.2...v2.11.0-rc.3) (2026-03-13)


### Features

* **398-01:** add CONTRACT_DEPLOY as 9th transaction type with Zod SSoT ([6097302](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6097302529ccaac99a1ad06fda8c364fd069bf02))
* **398-01:** integrate CONTRACT_DEPLOY into pipeline and policy engine ([e084c73](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e084c7316e478f6bca980c5e794f4350b0743940))
* **398-02:** add DB v58 migration and EVM chainId reverse lookup ([badf858](https://github.com/minhoyoo-iotrust/WAIaaS/commit/badf858ea3b550d6239cc6a690661a22ab84895a))
* **398-02:** set keepAliveTimeout 600s for RPC proxy long-poll support ([d3b9547](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d3b9547ffd3421ce9f689b3ae1182ce8194707ec))
* **399-01:** add JSON-RPC 2.0 protocol utilities ([bfdc761](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bfdc761c53415bcd51582c0b45c6091351a50285))
* **399-01:** add RpcTransactionAdapter and hex utilities ([7ed36d0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7ed36d0662494cd4f6579f7ba67f974a480175b0))
* **399-02:** add CompletionWaiter and NonceTracker ([3642315](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3642315d656d4a358293513003bc371a004112df))
* **399-02:** add SyncPipelineExecutor for RPC proxy ([e60a677](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e60a6772a64473576dbd670428b1ef176ed2f5d5))
* **399-03:** add RpcMethodHandlers and barrel export ([0dc82c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0dc82c639af8a94abefae2e9d8ec875538a09275))
* **399-03:** add RpcPassthrough for read method proxying ([04f2885](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04f28852c5c1250bf530e133508c9a529ccdb228))
* **400-01:** add RpcDispatcher, Hono route, and sessionAuth for EVM RPC proxy ([c15e82e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c15e82ec12a7911aeb7dc5705df2e76e5dc3984e))
* **400-02:** add long-poll async timeout formatting, from validation, and batch tests ([557aa81](https://github.com/minhoyoo-iotrust/WAIaaS/commit/557aa817eb47d5e96223d104adddd1a3994c108f))
* **401-01:** add Admin UI RPC Proxy page with settings and audit log ([ad7f58f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ad7f58fc0dbdd276039e2e0c29d10acd8aaf5997))
* **401-01:** register 7 rpc_proxy.* settings in SettingsService SSoT ([66beea2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/66beea2706223ffbc786fe5e29a1eead8f2bef3c))
* **401-02:** add MCP get_rpc_proxy_url tool, SDK getRpcProxyUrl(), connect-info rpcProxy field ([02bd5fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/02bd5fb70ba2fd7cc10e98075f86f713360289bb))
* add GitHub Pages landing site with AEO support ([29e51a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/29e51a0493e8ec8d0bc4d5a1b71e5004e4176cae))


### Bug Fixes

* add rpc-proxy route to E2E coverage map ([9485b6d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9485b6d643f97f772ed42f9264089635e5295a08))
* fix rpc-proxy admin page type errors and add comprehensive tests ([bf94051](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf94051055134eca5a1fc0fcc3669c47cdba91d7))
* resolve typecheck errors in rpc-proxy and daemon modules ([82decc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/82decc1693fbc409554278c77bdcab1e9ae36469))
* resolve unused variable lint errors in rpc-proxy files ([0a2f55a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a2f55a72480d044b27cf5f4506834ef610b5559))
* update MCP tool count to 58 after adding get_rpc_proxy_url ([2f1f6de](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2f1f6de60a74b4edd9e95c41d105ffbbd9eecbe4))
* update test expectations for DB v58 and rpc_proxy settings ([df734da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/df734da441f1ce1a78b473f1ede0a3249db5f24a))

## [2.11.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc.1...v2.11.0-rc.2) (2026-03-12)


### Features

* **393-01:** implement IPositionProvider on LidoStakingActionProvider ([29d42b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/29d42b2eb17421f63439394575d6a9c73b55fcc2))
* **393-02:** implement IPositionProvider on JitoStakingActionProvider ([ac76c5a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ac76c5a7e1ea66616afd70c05df1af5480b216a7))
* **394-01:** implement Aave V3 getPositions with Supply/Borrow/HF/Oracle ([2a98097](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a98097578131a12b5e1c8dbcf7509e667a655a2))
* **395-01:** implement Pendle getPositions() with PT/YT balance tracking ([0fcfea5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fcfea5b1c5d163f25b917432d74cb5d64367ab7))
* **396-01:** add IPositionProvider to HyperliquidPerpProvider ([5622308](https://github.com/minhoyoo-iotrust/WAIaaS/commit/562230833b5a852d655129fa31af29d597442f73))
* **396-02:** add IPositionProvider to HyperliquidSpotProvider ([585cd41](https://github.com/minhoyoo-iotrust/WAIaaS/commit/585cd41fd8a44d1c8c89b91cbb65c5d7159de301))
* **397-01:** add category tabs, wallet filter, HF warning banner to dashboard ([39f7847](https://github.com/minhoyoo-iotrust/WAIaaS/commit/39f7847d46e42fad89cf71cca0e3b1fc51a24f8a))
* **397-01:** add metadata field and category filter to admin defi positions API ([30f608b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/30f608b7b48afc98a84706e69a669db0018fcc9f))
* **397-02:** add provider grouping and category-specific detail columns ([1af4bfe](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1af4bfee488dbf63466c161e98d9c68783846de1))


### Bug Fixes

* remove unused type imports in Hyperliquid test files ([b4ab742](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4ab742aaf486bdb80f404174501ec9f9fee1f4e))

## [2.11.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.11.0-rc...v2.11.0-rc.1) (2026-03-12)


### Bug Fixes

* resolve {amount} placeholder in TX_CONFIRMED notifications ([#337](https://github.com/minhoyoo-iotrust/WAIaaS/issues/337)) ([2303c16](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2303c16f7e13afd718594211b308f0685af9d402))
* update migration-runner test versions for DB v57 ([8710d0a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8710d0a7bcbe43e9e40c8d7abf83239bf9e90c99))

## [2.11.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.1-rc...v2.11.0-rc) (2026-03-11)


### Features

* **380-01:** design ResolvedAction 3-kind Zod discriminatedUnion type system ([94e5dba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/94e5dba96d3a125bf757701148b9aac4b3aaf6a5))
* **380-02:** design ISignerCapability interface and SigningSchemeEnum (7 schemes) ([b230912](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b23091237130ea1ee0a97d7b5019e64244448b1f))
* **381-01:** design ICredentialVault interface, DB schema, encryption, scope model ([1e02134](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1e02134c6ea07787052546f68fca3316ae5f6f29))
* **381-02:** design Admin UI Credentials tab, MCP tools, SDK methods ([31a1c71](https://github.com/minhoyoo-iotrust/WAIaaS/commit/31a1c7112894dfbf023b604584b0534c4a768db4))
* **382-01:** design existing 4 signer adapters + signBytes 2 capabilities ([43be800](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43be8009bda9d9c447e295c3d8e81b18374f1d80))
* **382-02:** design HMAC/RSA-PSS capabilities + SignerCapabilityRegistry ([926b98f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/926b98ffb696b4cc79dbd8ff3b90f3a42e9b11dd))
* **385-01:** integrate 10 design docs into unified doc-81 ([765ddc1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/765ddc1c391b49a87ba1a548f47407ce434ca28e))

## [2.10.1-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0...v2.10.1-rc) (2026-03-11)


### Bug Fixes

* **#332:** clean up planning directory — remove orphans, relocate misplaced files ([70bb0d3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/70bb0d376ea42f9b1a2aeb770b643a8d75707ddc))
* **#333:** add CAIP-2 chain identifier and signer address to SignRequest ([caea262](https://github.com/minhoyoo-iotrust/WAIaaS/commit/caea2622d62e2e143b38118081195b976f800a9f))
* **#334:** read max_sessions_per_wallet from SettingsService at runtime ([5587d6d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5587d6dc64606fc94b015db70fe5e79b416733e9))
* **#335:** remove legacy Settings page, move AA keys to System, add API key dashboard links ([5c7dc6b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5c7dc6b888f3c4936d2d4f11b7d460ccfd72823f))
* **#336:** use z.coerce.number() for Across depositId to handle string responses ([4e130b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e130b5a8b27a5e02877df2aec787ed81766654e))
* add split admin route files to E2E coverage map ([4bd6f39](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4bd6f39584799ab48c394131228c0e2d66c70203))

## [2.10.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.28...v2.10.0) (2026-03-11)


### Bug Fixes

* promote v2.10.0-rc.28 to stable 2.10.0 ([c8005ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c8005ba4f5cb926aff7865b2c2a7231b840e919f))

## [2.10.0-rc.28](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.27...v2.10.0-rc.28) (2026-03-11)


### Features

* **371-01:** Polymarket CLOB infrastructure (Signer, ClobClient, RateLimiter, OrderBuilder) ([8cbabb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8cbabb8f31c7bf83ffcc17d5e55f1341261ad0aa))
* **371-02:** DB migration v53-v54 (polymarket_orders, positions, api_keys) ([7578979](https://github.com/minhoyoo-iotrust/WAIaaS/commit/757897971458e745fa4edb2d997cf6df489fda9e))
* **371-03:** PolymarketOrderProvider + ApiKeyService ([7d66f7b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d66f7b2d4ac79c00954887472bfd44cc7eba16e))
* **371-04:** NegRiskRouter, ApproveHelper, OrderbookService, Infrastructure factory ([4c99654](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c99654d4a1341bfd0baf89e5afbe69812c9d86a))
* **372-01:** add PolymarketGammaClient + market Zod schemas ([3c93886](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3c93886106008dc371ddb92baa10a72c45f33392))
* **372-01:** add PolymarketMarketData caching service + index exports ([ee417cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ee417cc9c7a577f6db378527962258beaedc5282))
* **372-02:** add PolymarketCtfProvider with 5 on-chain CTF actions ([1c620e3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1c620e3a9128a1cab3cdd00409c655ed511c92e1))
* **372-02:** wire CtfProvider into index exports and infrastructure factory ([eca8b38](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eca8b382ab014a394407d80ad8e9132d3d520b41))
* **372-03:** add PositionTracker + PnlCalculator with bigint precision ([093d971](https://github.com/minhoyoo-iotrust/WAIaaS/commit/093d971f9f1b678200f3e6d58aad5aa392935e23))
* **372-03:** add ResolutionMonitor + wire full factory with NegRiskResolver ([895d3af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/895d3af160dae87edd06d6efdd13cb32c32ec17c))
* **373-01:** add Polymarket Admin Settings, REST query routes, and daemon boot ([eea3887](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eea38871d4872d6271b35eddd1faf0b83fbb2615))
* **373-02:** add Polymarket MCP query tools and SDK client methods ([32289bd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32289bd4f617031c239e43e4abc63c14b323bf91))
* **373-03:** add Polymarket Admin UI 5-tab page with components ([bb8020f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bb8020f0adb9c6b461265a7619e0dd7dfb0584af))
* **373-03:** add Polymarket to Admin UI navigation with 10 tests ([9f8b56a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9f8b56af7b7ed301cda1e2e732bdc6c3f9bd5614))
* **373-04:** add Polymarket connect-info capability and policy integration tests ([3e3f15f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e3f15fd4f34dc1e2d55aaaf7244b5073a266cbf))
* **373-04:** create polymarket.skill.md and update actions.skill.md ([7b52081](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7b52081fa5cfdde77c75a2a3c71094c71a4786bd))


### Bug Fixes

* add Admin UI audit logs page ([#331](https://github.com/minhoyoo-iotrust/WAIaaS/issues/331)) ([3c7992c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3c7992c6997f6133b05882b17ea4a938c45b9ee7))
* add polymarket to PROVIDER_SCENARIO_MAP for Agent UAT check ([f47479a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f47479af9a09b525af475aef67eda23a4e0c9ef1))
* **jito-staking:** create JitoSOL ATA before DepositSol instruction ([#328](https://github.com/minhoyoo-iotrust/WAIaaS/issues/328)) ([da36d6b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/da36d6b4b48c425c062b677ff8a1f1b7ee7f526c))
* resolve 2 lint errors (prefer-const, no-unused-vars) ([d5d0524](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5d0524e349475397fff900c00057be3e065e12f))
* resolve 2 open issues ([#322](https://github.com/minhoyoo-iotrust/WAIaaS/issues/322), [#323](https://github.com/minhoyoo-iotrust/WAIaaS/issues/323)) ([f22bd57](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f22bd57123de5665c84055b574ea087aca7ce766))
* resolve 6 open issues ([#324](https://github.com/minhoyoo-iotrust/WAIaaS/issues/324), [#325](https://github.com/minhoyoo-iotrust/WAIaaS/issues/325), [#326](https://github.com/minhoyoo-iotrust/WAIaaS/issues/326), [#327](https://github.com/minhoyoo-iotrust/WAIaaS/issues/327), [#329](https://github.com/minhoyoo-iotrust/WAIaaS/issues/329), [#330](https://github.com/minhoyoo-iotrust/WAIaaS/issues/330)) ([bf4461b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf4461bbbcb0eb6b70f322cd80fe7d99d9ab8523))
* update all test assertions for DB schema v54 and Polymarket integration ([a916321](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a916321039d9e96aa7c65c91a2bfbb85b761d0a7))
* update AuditAction expectedCount to 26 for Polymarket audit action ([2585ab4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2585ab450e86a2118e2c69771234e4f76d87a28a))
* update MCP server test for 55 tools (add 8 Polymarket tools) ([2dd258d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2dd258d08c0c79255dcccb8580c9df8492fbee98))
* update test badge Gist ID in README ([fc56c8f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc56c8f6b5e20fd75261abcbe642f67619a20718))
* update zerox-swap and pendle tests for issue fix changes ([ee18b1f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ee18b1f275d268f25d98eddacc643714967424f0))

## [2.10.0-rc.27](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.26...v2.10.0-rc.27) (2026-03-10)


### Bug Fixes

* resolve issues [#310](https://github.com/minhoyoo-iotrust/WAIaaS/issues/310)-[#321](https://github.com/minhoyoo-iotrust/WAIaaS/issues/321) — DeFi provider bugs, Admin UI gaps, and config fixes ([724dbaa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/724dbaaf54027e5148c22dbf38fb244a53b9ec82))
* resolve issues [#310](https://github.com/minhoyoo-iotrust/WAIaaS/issues/310)-[#321](https://github.com/minhoyoo-iotrust/WAIaaS/issues/321) and archive milestones m28.6-m31.8 ([58ee21d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/58ee21dd349199f2ea2f98877763608dac3acb2c))
* update RPC key count test to reflect HyperEVM additions ([3ab088e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3ab088ee54ce9ed17644a51694d65c251b340d65))

## [2.10.0-rc.26](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.25...v2.10.0-rc.26) (2026-03-10)


### Bug Fixes

* **ci:** add @waiaas/shared to release pipeline ([#311](https://github.com/minhoyoo-iotrust/WAIaaS/issues/311)) ([61ea5f3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/61ea5f3fceab25fbfe5eb97ae03bdda856b0e6f2))
* **docker:** add @waiaas/shared to Dockerfile build stages ([#311](https://github.com/minhoyoo-iotrust/WAIaaS/issues/311)) ([1130fbf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1130fbf297ad393e3dbb40d37a61985553090e69))

## [2.10.0-rc.25](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.24...v2.10.0-rc.25) (2026-03-10)


### Features

* add @waiaas/shared constants package ([2d276a2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d276a244fb07e375a27718cac493640a7e6c4ab))


### Bug Fixes

* **admin:** update RPC endpoint count in settings test for HyperEVM networks ([9643374](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9643374520655a36a8bd1c1925560090e1fe79fa))
* **ci:** add @waiaas/mcp to e2e-smoke build filter ([086b082](https://github.com/minhoyoo-iotrust/WAIaaS/commit/086b08215c3af4bc909c52df821e79570877effa))
* resolve issues [#304](https://github.com/minhoyoo-iotrust/WAIaaS/issues/304)-310 — UAT API mismatches, HyperEVM network lists, shared constants, Hyperliquid keys ([8bdd5ce](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8bdd5cef9101649327fdb6ec3f6ca8d5580744c4))
* resolve issues [#304](https://github.com/minhoyoo-iotrust/WAIaaS/issues/304)-310 — UAT API mismatches, shared constants, HyperEVM networks ([d8ee3d3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8ee3d3e100e585bb2396bba7e2c332ac98b7102))

## [2.10.0-rc.24](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.23...v2.10.0-rc.24) (2026-03-10)


### Bug Fixes

* **ci:** install @waiaas/cli instead of @waiaas/daemon in e2e-smoke ([2353959](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2353959f6f50ea7618cf92d942a3a7bbed3056d4))
* **ci:** install @waiaas/cli instead of @waiaas/daemon in e2e-smoke ([fe6824a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe6824a50781bb23b3f3e7ca7d9c7e9607f5da81))
* move agent-uat skill to .claude/skills/ ([#303](https://github.com/minhoyoo-iotrust/WAIaaS/issues/303)) ([e9ce720](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e9ce720ccf95b2cd2b6143deef2a0de7eea680d2))
* move agent-uat skill to .claude/skills/ for dev/runtime separation ([#303](https://github.com/minhoyoo-iotrust/WAIaaS/issues/303)) ([412e996](https://github.com/minhoyoo-iotrust/WAIaaS/commit/412e996ed0bdf78300052f79d4921ac71d92bf67))

## [2.10.0-rc.23](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.22...v2.10.0-rc.23) (2026-03-09)


### Features

* **366-01:** add 3 advanced testnet scenarios (Hyperliquid/NFT/IncomingTX) ([55eb88c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/55eb88c8ddf4e9bf28cf25e7365af5de1ca30445))
* **366-01:** add 4 testnet transfer scenarios (ETH/SOL/ERC-20/SPL) ([0200bdd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0200bddd59eb0412e949443708e145c69ba5afea))
* **366-02:** add 6 mainnet transfer scenarios (ETH/SOL/ERC-20/SPL/L2/NFT) ([755da57](https://github.com/minhoyoo-iotrust/WAIaaS/commit/755da57faa1534ececc721822e6c6039807a21ab))
* **367-01:** add Jupiter Swap and Jito Staking scenarios ([09cafdc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/09cafdcbb28de7142f72ff6ea5d5f4a74138acbd))
* **367-01:** add Kamino Lending and Drift Perp scenarios ([1ad1d41](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ad1d41fb30a02da45fceecff796ec03aede08d2))
* **367-02:** add 0x Swap, Lido Staking, and DCent Swap scenarios ([ccf3d06](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ccf3d0640aaf663ee76cffd38d78f3e7aab317b5))
* **367-02:** add Aave V3 Lending and Pendle Yield scenarios ([068f73b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/068f73bd0a7f0cbe9e0ac65e446b4c305cdac782))
* **367-03:** add LI.FI Bridge, Across Bridge, and Hyperliquid Mainnet scenarios ([7871548](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7871548914443e9f4bf3f47668ebb86df3a2d31d))
* **367-03:** register all 12 DeFi scenarios in _index.md ([5050cbb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5050cbb912819c627c0027362e171e4b8c6c4f85))
* **368-01:** add advanced scenarios for incoming TX, balance monitoring, gas conditional ([41e5042](https://github.com/minhoyoo-iotrust/WAIaaS/commit/41e50424291504ed155476532b334186e9f768d4))
* **368-01:** add advanced scenarios for Smart Account, WalletConnect, x402 ([c5d76b8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c5d76b84aedb56451e71fbcd74bd72e103eb315a))
* **368-02:** add admin UI scenarios for page access, authentication, dashboard ([a64b57a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a64b57ac253572b3e25dca7b730234c3cd918a49))
* **368-02:** add admin UI scenarios for settings, policy management, wallet management ([2895928](https://github.com/minhoyoo-iotrust/WAIaaS/commit/28959283fc8af150c23b5a5f6bf6078f7fbae63a))
* **368-03:** add admin scenarios for backup, tokens, stats + update _index.md ([17ea361](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17ea361beb4b27dfa9422b1323fcfc2b5e76f27a))
* **368-03:** add admin UI scenarios for NFT, DeFi, notifications, audit logs ([1a0f517](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1a0f517547a8605f8123c2aaf863794ba547d245))
* **369-01:** add index registration and admin route consistency scripts ([6785e36](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6785e368cecaecf43373f5800072bea75fce5f5e))
* **369-01:** add provider mapping and format verification scripts ([3c2cf2b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3c2cf2bc01467abdf7ed7d346df97471b1609f9b))
* **369-02:** integrate agent UAT verification into CI workflow ([915e774](https://github.com/minhoyoo-iotrust/WAIaaS/commit/915e77485e6fef00f554befaa8792c960e537ac5))


### Bug Fixes

* **e2e:** resolve global CLI PATH regression and add L2 testnet coverage ([#301](https://github.com/minhoyoo-iotrust/WAIaaS/issues/301), [#302](https://github.com/minhoyoo-iotrust/WAIaaS/issues/302)) ([a3ad32a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a3ad32a30a03f8cb48d9dab4eec5e4c7ae52ae58))

## [2.10.0-rc.22](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.21...v2.10.0-rc.22) (2026-03-09)


### Bug Fixes

* add missing network query param to E2E onchain balance precondition check ([#298](https://github.com/minhoyoo-iotrust/WAIaaS/issues/298)) ([ac49563](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ac495637ce2b241ba42231710b8037b5ca9a9211))
* change E2E onchain default port from 3000 to 3100 to match daemon default ([#295](https://github.com/minhoyoo-iotrust/WAIaaS/issues/295)) ([35f2268](https://github.com/minhoyoo-iotrust/WAIaaS/commit/35f2268c983d52e85bfbf57f7d5248d8c043f1fd))
* remove deprecated Holesky testnet references and E2E staking tests ([#299](https://github.com/minhoyoo-iotrust/WAIaaS/issues/299)) ([0f5a60e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0f5a60ed61a523849ffef721856aed0b8db3a7a2))
* replace txId with txHash in E2E onchain test assertions to match API response ([#300](https://github.com/minhoyoo-iotrust/WAIaaS/issues/300)) ([ed8b13b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ed8b13bd57314ed5f3cc7cbdce9f725f42f6f020))
* resolve E2E offchain test failures for Admin UI path, settings key, and SDK auth ([#292](https://github.com/minhoyoo-iotrust/WAIaaS/issues/292), [#293](https://github.com/minhoyoo-iotrust/WAIaaS/issues/293), [#294](https://github.com/minhoyoo-iotrust/WAIaaS/issues/294)) ([931d239](https://github.com/minhoyoo-iotrust/WAIaaS/commit/931d2393138c3b475f2c5e941a52a2a6538cd3e2))
* resolve E2E smoke CI failures ([#289](https://github.com/minhoyoo-iotrust/WAIaaS/issues/289), [#290](https://github.com/minhoyoo-iotrust/WAIaaS/issues/290), [#291](https://github.com/minhoyoo-iotrust/WAIaaS/issues/291)) ([4d482b3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d482b324ac46c62356b84b880e0a29c21fcbdc5))
* update E2E onchain tests to use v29.5 unified network IDs and fix settings response access ([#296](https://github.com/minhoyoo-iotrust/WAIaaS/issues/296), [#297](https://github.com/minhoyoo-iotrust/WAIaaS/issues/297)) ([fd1c8b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd1c8b4fed6a0fd9381b2d677b09eed54ca13f77))

## [2.10.0-rc.21](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.20...v2.10.0-rc.21) (2026-03-09)


### Bug Fixes

* resolve E2E test failures ([#286](https://github.com/minhoyoo-iotrust/WAIaaS/issues/286), [#287](https://github.com/minhoyoo-iotrust/WAIaaS/issues/287), [#288](https://github.com/minhoyoo-iotrust/WAIaaS/issues/288)) ([afd9cd7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/afd9cd7ec83b15e5473abba13957b8c04fe9f3bc))
* resolve E2E test failures for admin UI build, API format, and audit-log fields ([#286](https://github.com/minhoyoo-iotrust/WAIaaS/issues/286), [#287](https://github.com/minhoyoo-iotrust/WAIaaS/issues/287), [#288](https://github.com/minhoyoo-iotrust/WAIaaS/issues/288)) ([a9167fc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a9167fcde64c91a5879c87b1d4f60699c545dd2c))

## [2.10.0-rc.20](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.19...v2.10.0-rc.20) (2026-03-09)


### Bug Fixes

* support E2E_DAEMON_INSTALL_MODE=global in DaemonManager and PushRelayManager ([b932100](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b9321004fd40417e62f7436d205d2da168fafb57))

## [2.10.0-rc.19](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.18...v2.10.0-rc.19) (2026-03-09)


### Bug Fixes

* use workflow_run trigger for E2E smoke tests ([#284](https://github.com/minhoyoo-iotrust/WAIaaS/issues/284)) ([8d7828e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d7828ed8c0d617db3e7f421c42871a35a191a72))
* use workflow_run trigger for E2E smoke tests to avoid race condition ([299bad3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/299bad38eb3786676281724e7c106eed3a6497a7)), closes [#284](https://github.com/minhoyoo-iotrust/WAIaaS/issues/284)

## [2.10.0-rc.18](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.17...v2.10.0-rc.18) (2026-03-09)


### Features

* **357-01:** add E2E test package with scenario type system and reporter ([891dac1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/891dac194748ed0877d737a92c2bd0b29958c246))
* **357-02:** add daemon and push relay lifecycle management utilities ([d56680b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d56680b9559ce9d288195147cc2af4c3da654bf9))
* **357-03:** add session management and HTTP client helpers ([1adca3e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1adca3e2f198f774cffe8ebc1991ebc659f10aa3))
* **358-01:** add auth/wallet/session E2E scenarios ([c9f926b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9f926ba09bbbcb4845bba54980a01153395f0c8))
* **358-02:** add policy CRUD + dry-run simulate E2E scenarios ([cec1add](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cec1add3212e3832cff3d53e3f334322c8044cbd))
* **359-01:** add Admin UI, MCP stdio, and SDK interface E2E tests ([696ce40](https://github.com/minhoyoo-iotrust/WAIaaS/commit/696ce40885ea4074618accacc1e7e0ad3b86a8cb))
* **359-02:** add notification, token registry, and connect-info E2E tests ([9098d0a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9098d0a9028b16de9cffd33db570939daba403a0))
* **359-03:** add audit log and backup/restore E2E tests ([e7f4d43](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7f4d43b04c03900cc1ec2d42bdf3aea9a5c4f5d))
* **360-01:** add Smart Account, UserOp, Owner Auth E2E scenarios ([945d6b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/945d6b255847f5462c853f14197c49b46f87c6f3))
* **360-02:** add x402, ERC-8004, ERC-8128 E2E scenarios ([102e107](https://github.com/minhoyoo-iotrust/WAIaaS/commit/102e10737882554dc2f223098f0b71a82fcb729a))
* **360-03:** add DeFi settings and Push Relay E2E scenarios ([288e7e8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/288e7e8954c2f4d5c6b79ef8dd42102ffc600055))
* **361-01:** add E2E smoke test CI workflow + CI reporter ([78b5d95](https://github.com/minhoyoo-iotrust/WAIaaS/commit/78b5d95a6c536bfbc26b983012bb186f0cc60e43))
* **361-02:** add network setting keys completeness test ([#282](https://github.com/minhoyoo-iotrust/WAIaaS/issues/282)) + dynamic badge ([#283](https://github.com/minhoyoo-iotrust/WAIaaS/issues/283)) ([9f83f56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9f83f5620da0d67b37085d80b42f7194bc476e89))
* **361-03:** add [#282](https://github.com/minhoyoo-iotrust/WAIaaS/issues/282) CI step + resolve issues [#282](https://github.com/minhoyoo-iotrust/WAIaaS/issues/282)/[#283](https://github.com/minhoyoo-iotrust/WAIaaS/issues/283) ([1399693](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1399693aa25b54465f47b4571914b279f54f03b1))
* **362-01:** implement PreconditionChecker with daemon/wallet/balance checks ([de1ab24](https://github.com/minhoyoo-iotrust/WAIaaS/commit/de1ab246268218e6bc1815fcc033c0013442e609))
* **362-02:** add interactive precondition prompt and onchain runner entry point ([34d778f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34d778f5e1a54f42a64a22b4f5492ca2aa1d4fd1))
* **363-01:** add ETH/SOL/ERC-20/SPL onchain transfer E2E tests ([3474f62](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3474f6251440c97036125a5dc3131bf8a6f9c9aa))
* **363-01:** add onchain skip utilities and vitest onchain project config ([a6e9102](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6e9102456953ebbdd93842a4746c9499a00c509))
* **363-02:** add incoming TX detection E2E test ([a920a1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a920a1bfde082d7fc9028d7456eb87e2b0489fb7))
* **363-02:** add Lido staking and Hyperliquid spot/perp E2E tests ([7006d9e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7006d9eefaf2c8a7224a7fbe4a2b4ab127531c6c))
* **363-03:** add NFT ERC-721 and ERC-1155 transfer E2E tests ([4a9ce2f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4a9ce2f428621239af436fc1cff75a5fdf944e53))
* **364-01:** add E2E coverage mapping registry ([6f2dc73](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6f2dc736b0c253a57e3af4cb4e0697741755293b))
* **364-01:** add verify-e2e-coverage.ts script ([2c245ea](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2c245eaf12a249643f362f4f60b16d535291196e))

## [2.10.0-rc.17](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.16...v2.10.0-rc.17) (2026-03-09)


### Bug Fixes

* **daemon:** add HyperEVM incoming.wss_url setting keys ([#281](https://github.com/minhoyoo-iotrust/WAIaaS/issues/281)) ([d126318](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1263188c3459755bc71bacde1761380d42dcc58))
* **daemon:** add HyperEVM incoming.wss_url setting keys ([#281](https://github.com/minhoyoo-iotrust/WAIaaS/issues/281)) ([f0b8923](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f0b8923818fc72153b62ea7e966f3ff5bd6f05e5))

## [2.10.0-rc.16](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.15...v2.10.0-rc.16) (2026-03-09)


### Bug Fixes

* **daemon:** add HyperEVM RPC and rpc_pool setting keys to SETTING_DEFINITIONS ([01ff13d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/01ff13d0b2327438c2a8df2fa94b0d03cc7aa0d2)), closes [#280](https://github.com/minhoyoo-iotrust/WAIaaS/issues/280)
* **daemon:** add HyperEVM RPC setting keys to SETTING_DEFINITIONS ([145a24c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/145a24c79aae4059ee476ef69ac2788b957f567b))
* **daemon:** add HyperEVM to BUILT_IN_RPC_DEFAULTS and rpc_pool settings ([f3dd6f7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3dd6f75e7f4778a93a0fb13364428d86c8a3968))
* **issues:** register [#280](https://github.com/minhoyoo-iotrust/WAIaaS/issues/280) HyperEVM RPC setting keys missing from SETTING_DEFINITIONS ([b19e674](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b19e67487ebe5669f06710b7735cd07d996ff7e2))

## [2.10.0-rc.15](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.14...v2.10.0-rc.15) (2026-03-09)


### Features

* **353-01:** add AcrossApiClient with Zod schemas and chain config ([03e4b78](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03e4b78e881c71a35b270045927d13eda082edc2))
* **353-02:** add AcrossBridgeActionProvider with 5 actions and registry ([64262af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/64262afd3c51306ff8196dffca426078833870bd))
* **354-01:** add AcrossBridgeStatusTracker + AcrossBridgeMonitoringTracker ([bc23ebf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bc23ebf1290d0d261a35920a3355255773efbaed))
* **354-01:** daemon tracker registration + bridge enrollment ([6aaacb7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6aaacb71431ec7bb9ec3aaa8d4d7d633ccf04863))
* **355-01:** add Across Bridge admin settings, connect-info, and SDK methods ([ff5affe](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff5affe2388dc6271730373fe07b6b366b96876b))
* **355-02:** add Across Bridge to Admin UI, settings labels, and skill docs ([c087811](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c0878113cdb734d61c8a06cfcb5d150acbe87318))


### Bug Fixes

* **admin:** update action provider count in tests for Across Bridge ([7a7543c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7a7543cb4f8523ff6520ce176f3eefe2a7d333de))
* **daemon:** update settings count in tests for Across Bridge settings ([57ca73d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/57ca73dc51ded8bdebe559873084439efc108d8b))

## [2.10.0-rc.14](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.13...v2.10.0-rc.14) (2026-03-08)


### Features

* **347-01:** register HyperEVM Mainnet/Testnet in EVM chain registry ([a214a10](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a214a10f9e9ebea04009931be84ddc823c662b9b))
* **349-01:** add ApiDirectResult type, isApiDirectResult guard, requiresSigningKey ([1fbd53f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1fbd53fd6ef58f8aaed42abdc3b5a4e9c7e52f16))
* **349-01:** add Stage 5 ApiDirectResult branch and requiresSigningKey support ([7f544cd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f544cdc40a3311685a9fba983a144923a7c80db))
* **349-02:** add Hyperliquid shared infrastructure and DB v51 ([00d94ce](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00d94cefd852bc4b1d42a1b364aa26e1278c45a8))
* **349-03:** implement HyperliquidPerpProvider with 7 actions ([25fb2c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/25fb2c79f2c440eaacb4348c3a730c238a133699))
* **349-03:** register HyperliquidPerpProvider in built-in providers ([6fb1cbe](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6fb1cbea0d33561370e3843efbe825f7816141eb))
* **349-04:** add Hyperliquid REST API routes, MCP tools, and SDK methods ([0589453](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0589453d45f237adf9e439b9fb3499cb72569c1b))
* **349-05:** add Admin UI Hyperliquid page with positions, orders, and settings ([1e2bcd8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1e2bcd8e4d4088a9bcd9a56f1e81f7ec1299e9ec))
* **349-05:** add Hyperliquid Admin Settings defaults and update skill files ([ef6f45a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ef6f45ae04f66afad02cc1b6639522db27970872))
* **350-01:** add HyperliquidSpotProvider with 3 actions + tests ([d35c461](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d35c461217b4236e38df2ed576d6c068aa76d9cd))
* **350-01:** add Spot Zod schemas + MarketData typed Spot methods ([8c4bf2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c4bf2ec109fac8d945da6373e73a9f43c2198f0))
* **350-02:** add Admin UI Spot tab with balances and orders tables ([9a126c9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9a126c9352c138dedb0428f72ba99bd742e2da89))
* **350-02:** add Spot REST API + MCP tools + SDK methods + connect-info + skill ([15b0b22](https://github.com/minhoyoo-iotrust/WAIaaS/commit/15b0b22a9909031bd2441e6710ea77e138419123))
* **351-01:** add DB v52 migration for hyperliquid_sub_accounts table ([02b4e2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/02b4e2e1cad80ffc684261d9500cdebff17cd7ae))
* **351-01:** add HyperliquidSubAccountService with typed schemas ([1f35061](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f35061868f00728c0e813f7a7104e71427d5336))
* **351-02:** add Admin UI Sub-accounts tab and skill file documentation ([499996d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/499996d44520333c9513c693c807cd16ac5984df))
* **351-02:** add SubAccountProvider + REST/MCP/SDK endpoints + connect-info ([c9cfff7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c9cfff70a853d38ad930f099ff1476a3a1dff1b1))


### Bug Fixes

* **actions:** correct ActionContext type in sub-account provider test ([84aa68e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/84aa68e5f2397ae07b67b781c87a4e2ccf2605f4))
* **admin:** update provider card count from 10 to 12 for Hyperliquid ([40ef790](https://github.com/minhoyoo-iotrust/WAIaaS/commit/40ef7904bd3c5fc119baf43e1d718d0515a375b0))
* **core:** update environment and x402 tests for HyperEVM networks ([382858c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/382858c6e0c955544f2bfa1640f71327bce114a5))
* **daemon:** update test assertions for Hyperliquid DB and HyperEVM networks ([af09449](https://github.com/minhoyoo-iotrust/WAIaaS/commit/af09449e61c6da7c25b4cc08a395450021692d51))
* **mcp:** update server test for 47 tools including Hyperliquid ([a223137](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a2231373d4fd7975827afc3cdf2a2bdd7639732b))
* remove unused vi import in pipeline-api-direct test ([1c30471](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1c30471d26ace7c825dae70ffb433baef7f900e3))
* **sdk:** correct DCent test params to match DcentQuoteParams type ([f492a43](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f492a43ddade5e80cb6ce29b4ddc588a5ede5f89))
* update enum SSoT counts for HyperEVM networks ([73e5e28](https://github.com/minhoyoo-iotrust/WAIaaS/commit/73e5e2840acc157103bb5e5749301a2751249e66))

## [2.10.0-rc.13](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.12...v2.10.0-rc.13) (2026-03-07)


### Bug Fixes

* resolve UserOp Sign route network double-replace bug ([#279](https://github.com/minhoyoo-iotrust/WAIaaS/issues/279)) ([db53024](https://github.com/minhoyoo-iotrust/WAIaaS/commit/db53024bc7552f17c7248939003a63cd72a68f9b))
* resolve UserOp Sign route network double-replace bug ([#279](https://github.com/minhoyoo-iotrust/WAIaaS/issues/279)) ([eb2b509](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eb2b5091d78a0a85a56c03ac4c73276cae665739))
* update all test schema version refs from 49 to 50 (DB v50) ([767a88c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/767a88cf4a4833e1aa131640347b897548e622d8))
* update tests for new schema version 50 (DB migration v50) ([ca462cb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca462cbfbbaeca9f2b410f1566c99dbbf09deed9))

## [2.10.0-rc.12](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.11...v2.10.0-rc.12) (2026-03-07)


### Features

* add AA provider global default API key and policy ID ([#275](https://github.com/minhoyoo-iotrust/WAIaaS/issues/275)) ([56ebdcd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/56ebdcd5d66ca974069f6f0b59725a1f42e4cda2))


### Bug Fixes

* include unlimited sessions (expires_at=0) in active session count ([#274](https://github.com/minhoyoo-iotrust/WAIaaS/issues/274)) ([581ecb2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/581ecb241ecffc0bedf835466e4c6fbb25ed6af3))
* resolve issues [#277](https://github.com/minhoyoo-iotrust/WAIaaS/issues/277) and [#278](https://github.com/minhoyoo-iotrust/WAIaaS/issues/278) — NFT indexer settings visibility and D'CENT Swap multi-chain exposure ([d00713f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d00713f0da86ae9cf7798876cf07957ab03b3132))
* resolve open issues [#274](https://github.com/minhoyoo-iotrust/WAIaaS/issues/274)-[#278](https://github.com/minhoyoo-iotrust/WAIaaS/issues/278) ([ba99699](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ba996999356ad7e4c4050e8f3c418072a7231436))
* spending limit tier bar reads USD keys for correct visualization ([#276](https://github.com/minhoyoo-iotrust/WAIaaS/issues/276)) ([4d2213c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d2213c081b9691cd3fad2af57fed7cea9dc8caa))
* update tests for new AA provider global default setting keys ([5d632db](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d632dbcd0e33c12bd6b061cc5bb5091721a6275))
* wallets.tsx ternary syntax error in provider form ([#275](https://github.com/minhoyoo-iotrust/WAIaaS/issues/275)) ([95123e9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/95123e9a9d7406b3c11bd9b8c2de6e582ae753e9))

## [2.10.0-rc.11](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.10...v2.10.0-rc.11) (2026-03-07)


### Bug Fixes

* remove unused res variables in admin-actions-route test (lint) ([6e98b1c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6e98b1c023ebe0fb2f3b87c3db5e1d07e5ce4465))
* resolve open issues [#267](https://github.com/minhoyoo-iotrust/WAIaaS/issues/267)-[#273](https://github.com/minhoyoo-iotrust/WAIaaS/issues/273) ([92da49b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92da49b4832072fe7eab853d5e90bbd85e7a42b9))
* resolve open issues [#267](https://github.com/minhoyoo-iotrust/WAIaaS/issues/267)-[#273](https://github.com/minhoyoo-iotrust/WAIaaS/issues/273) — DCent DEX-only cleanup, admin UI fixes, builtin token, AA wallet address ([4c51e0e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c51e0e09f30b660fd14dc7f875999c8cbd24105))
* simplify adapter-pool mock to avoid async importOriginal CI failure ([9676517](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9676517e754b232eec1a7775fc2b7e0cb45a5463))

## [2.10.0-rc.10](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.9...v2.10.0-rc.10) (2026-03-06)


### Bug Fixes

* remove unused import and eslint-disable in dcent-api-client test ([10fa5b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10fa5b5f16c4875d72296e0a92cea07f36d20ee6))
* resolve open issues [#262](https://github.com/minhoyoo-iotrust/WAIaaS/issues/262)-266 ([d16660b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d16660b5d4c561e2fa2ee44a56ee627eb5bceb41))
* resolve open issues [#262](https://github.com/minhoyoo-iotrust/WAIaaS/issues/262)-266 — DCent Swap provider, mock data cleanup, deprecated SA warning, action categories, factory supported networks ([65c65a6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/65c65a6cb58ead0706b97d1a73d5c620547c20c9))

## [2.10.0-rc.9](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.8...v2.10.0-rc.9) (2026-03-06)


### Features

* **343-01:** add DcentSwapApiClient HTTP client with 24h currency caching ([8e58cd0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8e58cd0351a16a3e7fa56b18cd6aa2f53e5dc69a))
* **343-01:** implement CAIP-19 &lt;-&gt; DCent Currency ID converter with Zod schemas ([05de72f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/05de72f998b3d72b1ca2674af9d2c310bb0cf84d))
* **343-02:** add DcentSwapActionProvider implementing IActionProvider ([5d5d8d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d5d8d6e8ec59fcda61d6494d651e5d43f16ac3a))
* **343-02:** implement DEX Swap quote retrieval and execution pipeline ([3410f22](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3410f22b1993d71cc1dad4398e21a6f28dd92c07))
* **344-01:** extend DcentSwapActionProvider with exchange/status actions and notification events ([49670f7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/49670f78b0a38450fc8cf2d443fc186dab09dfb9))
* **344-01:** implement exchange quotes, execution, and status tracker ([2387f7c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2387f7c23dcb26a4dd40e7c3fe3a2b3a8693d1a3))
* **345-01:** implement 2-hop auto-routing with fallback route discovery ([d6962ad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6962ada4f92947535dc97d2ddeeb62703e964fa))
* **345-02:** integrate auto-routing fallback into DcentSwapActionProvider ([4d98ede](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d98ede4d47e9e3e0f4c0d9d089caec664b3dd06))
* **346-01:** register DcentSwapActionProvider in daemon lifecycle ([bc13930](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bc13930ef427009c3710414b434f937dcd211fd3))
* **346-02:** add SDK DCent Swap methods and update skill files ([2122292](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2122292f98e8ecc49b004da6ab7c63b3abb0e758))
* add DB v46-v47 schema changes and update test fixtures ([47e88ea](https://github.com/minhoyoo-iotrust/WAIaaS/commit/47e88ea6e1afefddb480695e1d67c2522feb730e))


### Bug Fixes

* **actions:** remove unused callCount variable in dcent-auto-router test ([30424a1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/30424a1a720defe1cd46964c47a170962fadc5f4))
* **admin:** wrap mock wallets response in { items: [] } to match API format ([b459fd2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b459fd21088d76d59f0ae03cd3fe4fe75452d9a9))
* **dcent-swap:** register ExchangeStatusTracker, add hot-reload support, fix lint ([d3b7563](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d3b7563ff4de2cba404100c06cd4f2728fe1d16e))
* resolve 3 open issues ([#255](https://github.com/minhoyoo-iotrust/WAIaaS/issues/255), [#258](https://github.com/minhoyoo-iotrust/WAIaaS/issues/258), [#260](https://github.com/minhoyoo-iotrust/WAIaaS/issues/260)) ([7d547aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d547aa368f8c80c3d8947d4e2babd02cd6e03e0))
* resolve 3 open issues ([#257](https://github.com/minhoyoo-iotrust/WAIaaS/issues/257), [#259](https://github.com/minhoyoo-iotrust/WAIaaS/issues/259), [#261](https://github.com/minhoyoo-iotrust/WAIaaS/issues/261)) ([d3ea5ec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d3ea5ec391b84ded1ccedcfecac74db782d2314b))

## [2.10.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.7...v2.10.0-rc.8) (2026-03-06)


### Features

* **338-01:** allow Smart Account creation without provider (Lite mode) ([ae0f514](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae0f5147da71a1020031d1e4615e5790d8bc0075))
* **338-01:** block Lite mode Smart Account send with CHAIN_ERROR + userop guidance ([ef52df3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ef52df38fca545b7605dedd6412dce1f99b65ea8))
* **338-02:** add UserOp v0.7 Zod schemas and 5 USEROP error codes ([8359257](https://github.com/minhoyoo-iotrust/WAIaaS/commit/83592575fe9fd81cb89135731cf74eb5d32ab165))
* **338-02:** DB v45 migration with userop_builds table + Drizzle schema ([c2f27d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c2f27d717eeb25f9a4c75e620b4aff9307c82abe))
* **339-01:** POST /v1/wallets/:id/userop/build endpoint ([5901f13](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5901f1393d2333f90d1913f5bd9a9b6425473da0))
* **339-02:** userop-build-cleanup worker for expired build records ([e7751e4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7751e4f0b10b95e37920f881f6314f9dcdf1024))
* **340-01:** POST /v1/wallets/:id/userop/sign endpoint with callData verification ([0f52247](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0f52247a19b90da620bfa4eebce1fd323677611f))
* **340-02:** add userop capability to connect-info + prompt guidance ([e27e5aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e27e5aaa851bc8c08603d54cf8a5b5a0ae1eb571))
* **341-01:** add Provider None (Lite mode) option and Lite/Full badges in Admin UI ([08b3798](https://github.com/minhoyoo-iotrust/WAIaaS/commit/08b3798cc89627a1c978920397127ee58233596e))
* **341-02:** add MCP build_userop and sign_userop tools with 4 tests ([22ce828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/22ce828e36ba84dd8be1b95fa0cb3472702ca4ff))
* **341-02:** add SDK buildUserOp/signUserOp methods and update 3 skill files ([2d46da2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d46da2d363555604cf525377cfcd7e4cd296bfa))


### Bug Fixes

* add Push Relay CORS middleware and --debug mode ([#253](https://github.com/minhoyoo-iotrust/WAIaaS/issues/253), [#254](https://github.com/minhoyoo-iotrust/WAIaaS/issues/254)) ([d5e0439](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5e0439a0f38bd488991137a7d2ed2a9b5ebab1d))
* remove unused variables in userop route handler tests ([a7c8689](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a7c8689cb7e3940f82efd2e08a8df8e8abc146e7))
* resolve lint errors in v31.2 test files ([67c85f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/67c85f544dc1f027b2f6fd8684232413235280f8))

## [2.10.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.6...v2.10.0-rc.7) (2026-03-06)


### Features

* **333-01:** add NFT_TRANSFER 6th discriminatedUnion type + APPROVE nft extension + NFT error codes ([586fe54](https://github.com/minhoyoo-iotrust/WAIaaS/commit/586fe54c66f37c942757ad4bc01b5d1c099c0224))
* **333-02:** add DB v44 migration for nft_metadata_cache table + Drizzle schema ([5202e9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5202e9f94206df7b985ebaa102a3b182c6282934))
* **333-02:** add nftAssetId() and isNftAsset() CAIP-19 helpers for NFT namespaces ([fc4f5e8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc4f5e8d03ed24a78b0fe040c962da26a2945393))
* **334-01:** add AlchemyNftIndexer with Alchemy NFT API v3 ([eab4989](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eab4989c30b25a8b054ccd962b6832dd4efb8b8f))
* **334-01:** add INftIndexer interface with Zod schemas ([0b662ae](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0b662ae2cc94da17979e8ae8e03dfcdaf39d2f34))
* **334-02:** add HeliusNftIndexer, NftIndexerClient, and indexer settings ([e062b93](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e062b93302724b7503820f1d63d2bbd170edc016))
* **334-03:** extend IChainAdapter with NFT methods + EVM ABI files ([4f29976](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f29976060227a06d0b00731f99f8cfdd2b4fd22))
* **334-03:** implement NFT methods in EvmAdapter and SolanaAdapter ([c3bd5d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3bd5d135080be4b6555c421dd20ad52f8f9c954))
* **335-01:** add NFT list REST routes with pagination and collection grouping ([e6c4ff8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e6c4ff88157889c75e088c840b3d0dc5b8c10b81))
* **335-02:** add NFT metadata endpoint with tokenIdentifier parsing and cache integration ([d4bc0d9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4bc0d9a12601f47bd282dfdf902719712f8edfc))
* **335-02:** add NftMetadataCacheService with DB caching and IPFS/Arweave gateway conversion ([7221479](https://github.com/minhoyoo-iotrust/WAIaaS/commit/722147996b28009c9d9f62df4bd4c026cf202782))
* **336-01:** add NFT_TRANSFER case to pipeline switch functions ([47ff779](https://github.com/minhoyoo-iotrust/WAIaaS/commit/47ff77909f34a7654b8ce4a718780f376e15d4e7))
* **336-01:** add NFT_TRANSFER Smart Account UserOp support ([fc08600](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc086000c25e6db2597bbc3d46595d55c7e2b533))
* **336-02:** add APPROVE+nft routing and NFT_TRANSFER policy evaluation ([075c99d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/075c99d34dc0df0fa3e539ce96e1065d0e4ca12c))
* **336-02:** add NFT approval status query API ([04704f8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04704f8d668957473ec1ae5fe508380a2a5c6c24))
* **337-01:** add MCP NFT tools, SDK NFT methods, connect-info NFT summary ([c932b39](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c932b39cffe65b5ab9219bbf2759908d137e097f))
* **337-02:** add Admin UI NFT tab, CSP IPFS/Arweave gateways, indexer settings ([8e06fa4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8e06fa4d9273c56784fe78770e011517dbf231ca))
* **337-03:** create nft.skill.md and update wallet/transactions skills ([24fd339](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24fd33928d0fee411d056381a07efdc0880abf49))


### Bug Fixes

* **335-01:** fix type errors in NFT indexer implementations and remove unused function ([bae11a2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bae11a2a4a7a5eed21640e548f818052f211fbd7))
* **admin:** guard against undefined NFT fields in detail modal ([00366b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00366b579ea4f25567c9560ece8337e3e74d7261))
* **mcp:** update tool count assertion to include 3 NFT tools ([a4a6702](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a4a6702affc16d5ad5a5008671a441ac7af4e229))
* **scripts:** update TransactionType expectedCount to 8 for NFT_TRANSFER ([ff83e65](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff83e6546c21e6b019c8710830ae89b3e3718f69))
* **v31.0:** mount NFT routes in server.ts + fix typecheck/lint errors ([3b53785](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3b53785b8bbfde5d09821b46ba0975139eb7debb))

## [2.10.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.5...v2.10.0-rc.6) (2026-03-05)


### Bug Fixes

* resolve issues [#250](https://github.com/minhoyoo-iotrust/WAIaaS/issues/250), [#251](https://github.com/minhoyoo-iotrust/WAIaaS/issues/251), [#252](https://github.com/minhoyoo-iotrust/WAIaaS/issues/252) — session rotate, Smart Account RPC URL, paymaster policy ID ([59e36fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/59e36fd61be200d19850adbbc247e6a599ac60c2))
* resolve issues [#250](https://github.com/minhoyoo-iotrust/WAIaaS/issues/250), [#251](https://github.com/minhoyoo-iotrust/WAIaaS/issues/251), [#252](https://github.com/minhoyoo-iotrust/WAIaaS/issues/252) — Smart Account RPC URL, paymaster policy ID, session rotate ([e519e27](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e519e2767e9da93a7a7d604ae4beaa4cd8d2f532))
* update test expectations for v43 migration ([2662800](https://github.com/minhoyoo-iotrust/WAIaaS/commit/266280025d5fd1bf12d812461a345327023c156b))

## [2.10.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.4...v2.10.0-rc.5) (2026-03-05)


### Features

* **330-01:** change all 10 action provider defaults to true + DB v42 migration ([cb6c89f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cb6c89faf9ddd76bcebcbdebb2ee355f788c2637))
* **330-02:** add enable/disable toggle to Agent Identity page + unify settings parsing ([50da645](https://github.com/minhoyoo-iotrust/WAIaaS/commit/50da645e9d4b97b946879fcdafb82da3dccf9467))
* **330-02:** rename menus to DeFi/Agent Identity + remove ERC-8004 card from DeFi page ([0e9ee6c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0e9ee6c4c550e3babffaea947af3fa422bfa4993))
* **331-01:** action tier override via Settings with pipeline floor integration ([a76f08a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a76f08ab9bbd9be367e6cfb21da08daa5671d86e))
* **331-02:** Agent Identity page Registered Actions table with tier dropdown ([d5c8d63](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5c8d639bc34169fb0d016971013f6deaa5fa611))
* **331-02:** DeFi page Description column + tier dropdown with override/reset ([674292f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/674292fc6e2e6d1a312cf46a702cfee3b2935fc2))


### Bug Fixes

* **admin:** add missing providers mock to erc8004-reputation tests ([f00645b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f00645b62a6097dd92cbbb9c347c7b27dd2653fa))
* **admin:** correct Smart Account field names in wallet creation form ([#249](https://github.com/minhoyoo-iotrust/WAIaaS/issues/249)) ([92cef54](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92cef542be60bb2de14ed83cace8a492a2b3a33e))
* **admin:** remove orphaned Smart Account bundler/paymaster fields from System settings ([e4d62b3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e4d62b31988d45d2abd23cac3ef26424a3df1096))

## [2.10.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.3...v2.10.0-rc.4) (2026-03-05)


### Features

* **327-01:** add ERC-8128 types, constants, keyid, and Content-Digest modules ([72b922c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/72b922c967d6a02c23a17233f897c6d33719912e))
* **327-01:** add Signature-Input builder and Signature Base construction ([1047d51](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1047d5199f4a366e225b8129913d4603da11f216))
* **327-02:** add HTTP Message Signer with EIP-191 signing via viem ([4f52828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f5282807632d721ce7eb29102f870a70cc172e6))
* **327-02:** add Verifier, barrel export, and wire erc8128 into @waiaas/core ([601315d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/601315d7955cada4865b5da2e0ca47202fce107e))
* **328-01:** add ERC-8128 admin settings, notification events, and i18n ([2db3cc2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2db3cc25cbee5f0cc2a012d4615055d7268300f7))
* **328-01:** add ERC8128_ALLOWED_DOMAINS policy type and domain evaluator ([5bae991](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5bae9913c729ea2e29b53f8b50f036986a9ff15c))
* **328-02:** add ERC-8128 sign and verify REST API endpoints ([5c80b10](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5c80b105dfe468f611e517435be77792577ea723))
* **328-02:** wire ERC-8128 routes into server with sessionAuth ([0a3f77d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a3f77d446fc124337f3c403bf3522a0134c0b97))
* **329-01:** add connect-info erc8128 capability and MCP tool tests ([789e5d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/789e5d11608e3bc54b65611a6bde0c81a7f21b65))
* **329-01:** add MCP erc8128_sign_request and erc8128_verify_signature tools ([cfe19ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cfe19bac9e9d3c3c81612e19ac629db27433ca5d))
* **329-02:** add SDK ERC-8128 methods (signHttpRequest, verifyHttpSignature, fetchWithErc8128) ([4fc1a0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4fc1a0d5f40d849e44ab078c10b93fc5cf2123cf))
* **329-03:** add Admin UI ERC-8128 policy form and system settings ([a2d0e81](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a2d0e81d45e7b37df74a69da8b8b207ec8a79c69))
* **329-03:** add erc8128.skill.md and update existing skill files ([3be3b53](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3be3b537dab2762a92242076612d2259ebb23651))


### Bug Fixes

* **329-01:** update server test tool count from 30 to 32 ([dd0403d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dd0403d863d95fa27ccd8b5041091ba4f7bd601b))
* remove unused NETWORK_TO_CAIP2 import in erc8128 route tests ([4290afa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4290afa816feeb6eb6c4c12d20e96a52ee113cf8))
* update enum SSoT expected counts for PolicyType (19) and NotificationEventType (56) ([6081fad](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6081fad4f52094c35eb835b3604d5d9d51bc8c23))
* update MCP erc8128 verify test assertions to match DEFECT-02 fix ([ff042c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff042c62bc98262661874687ade96417eba4b174))
* update notification event count assertion from 54 to 56 ([ce7e4e2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ce7e4e2b8db54903b61119dc95ed9354312759dc))
* **v30.10:** resolve 3 milestone audit defects ([0cb7da4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0cb7da439053c7037f48b0d16f59536a903e7df7))
* **v30.10:** resolve milestone audit defects and mark shipped ([1cce6bd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1cce6bd8c08255343f1a7220e65a943a4daf7b1c))

## [2.10.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.2...v2.10.0-rc.3) (2026-03-05)


### Features

* **324-01:** add AA provider enum, chain mapping, schema, and crypto ([6a81ad7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6a81ad77dd9822c3372f0c070da88819e1e5ec11))
* **324-01:** add DB migration v41 for per-wallet AA provider columns ([e239445](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e239445170af5b9657753fb50e9e4cd6ca8c2ae1))
* **324-02:** integrate wallet-based provider into pipeline + cleanup settings ([e62a395](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e62a395f02258eb4cf15f49424f89b0802aa665e))
* **324-02:** refactor smart-account-clients to wallet-based provider resolver ([8bcaf5b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8bcaf5bf6b80efe4cf39391d7dd02d8c62408775))
* **325-01:** implement PUT /v1/wallets/:id/provider with dual-auth ([72475d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/72475d1b3cfae20cd4c3ee5d4fd2a24038e26bb2))
* **325-02:** extend wallet detail/list responses with provider status ([9da0b02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9da0b02bc2fd087494aea7183a40d52dd307e38e))
* **326-01:** add provider display + edit in wallet detail page ([d6e87fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6e87fdad19165de2553f0ac02d919260224bba3))
* **326-01:** add provider fields to Admin UI wallet create form ([e95a285](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e95a285d12a82f69633a1f57977226cc255ab381))
* **326-02:** add MCP get_provider_status tool ([cda737b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cda737b2ab87e4dc192c2163fd8f894c90a88d0a))
* **326-02:** add provider status to connect-info prompt ([27e9b6e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/27e9b6e13190022fc4f9d0fa1e834586e376ae02))
* add generic EIP-712 signTypedData API ([#247](https://github.com/minhoyoo-iotrust/WAIaaS/issues/247)) ([2950361](https://github.com/minhoyoo-iotrust/WAIaaS/commit/29503613c2c3eb04b486672f045f82419eba7220))


### Bug Fixes

* **325-01:** fix type errors and add PROVIDER_UPDATED audit event ([b96682f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b96682f8e236c36dcab458141ceff80eec79c61a))
* add aaProvider to smart account test requests to pass Zod validation ([9ab2bc5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9ab2bc5d5aae82eca56a3d5ec336b01c6102ba5d))
* close v30.9 audit gaps (skill files, requirements, objective status) ([4fca0d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4fca0d6bfcc64dad045d40166baa54bc822fc6a8))
* format dashboard Recent Activity amounts in human-readable units ([#248](https://github.com/minhoyoo-iotrust/WAIaaS/issues/248)) ([7f1da93](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f1da93388df086fa1a34cc7c78360b3d6ec5a32))
* resolve unused variable lint errors in test files ([d1cdedd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d1cdeddf165eddeb68e68219ccec8fc316f25b5f))
* update remaining schema v41 test expectations and make migration idempotent ([1d41c14](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d41c14caec746d8012e3e923e5d6337005c9600))
* update test expectations for v30.9 per-wallet provider model ([c7994d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c7994d7ab031fbbf1a1122214a8a534f16531633))
* update test snapshots for DB schema v41 (4 provider columns) ([5f3c965](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5f3c9652b3ca9af42b2120da3ab0301b62e43735))

## [2.10.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc.1...v2.10.0-rc.2) (2026-03-04)


### Features

* **317-01:** add DB v39 migration for ERC-8004 foundation ([aeeeff7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aeeeff7279dcb6525ff20ca0ee465858f5fae4f6))
* **317-02:** add 9 ERC-8004 Admin Settings keys and i18n ko.ts notification templates ([8ea95d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ea95d4ea5edeb5552e0cc1247cecc4a7097c592))
* **317-02:** add ERC-8004 core enums, notification events, and reputation threshold policy schema ([280a9ed](https://github.com/minhoyoo-iotrust/WAIaaS/commit/280a9ede9a5bbd9ee21319b4da77b2e3d37ea70f))
* **318-01:** add ERC-8004 ABI constants, addresses, config, and Zod schemas ([79085b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79085b79ff01f3a1be12c6a3632ec74134329049))
* **318-01:** add Erc8004RegistryClient with calldata encoding and tests ([8f399b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8f399b4e20ddbd3a70af5b47801352696956b295))
* **318-02:** implement Erc8004ActionProvider with 8 write actions ([fdfd8c9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fdfd8c933b32647aa5b5c67320c23fb6af477ff6))
* **318-02:** register erc8004_agent in registerBuiltInProviders with tests ([4c2fa70](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c2fa707429fc9c151d22271704686d5a82e7661))
* **319-01:** add ERC-8004 read-only REST API routes and Zod schemas ([8d1e376](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d1e376b5c4385c4f59a0cad10d58e389641e9d2))
* **319-02:** extend connect-info with erc8004 per-wallet identity data ([d46776c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d46776ce2696c8ff18424c42d5eb60767e48fd0d))
* **320-01:** add ReputationCacheService with 3-tier cache ([817054e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/817054e19312291e9323e2cd24fe59448833e711))
* **320-02:** add REPUTATION_THRESHOLD policy evaluator with maxTier escalation ([007223e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/007223e5d493fbd17bf67b9c9d0761e4224338c1))
* **321-01:** EIP-712 typed data helper + ApprovalWorkflow + WcSigningBridge + approve endpoint ([88c8e11](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88c8e111f9c157d2cc7a23b2c0226d0f45367022))
* **321-02:** set_agent_wallet EIP-712 integration + pipeline calldata re-encoding ([d5d5c1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5d5c1b058a5af0c2f10bfa7a026a8722a4a39e5))
* **322-01:** add MCP 3 read-only tools + SDK 11 ERC-8004 methods ([3424695](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34246954787a4c2548046d0cffddfdcefa4caaad))
* **322-02:** add Admin UI ERC-8004 Identity management page ([145265b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/145265b7cc5302a3bcb361f1dba444754a31b965))
* **322-03:** add reputation dashboard, policy form, and actions provider entry ([0398eab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0398eabb076629bebdef606c293ca4e6cf716985))


### Bug Fixes

* **318-02:** remove unused ERC8004_DEFAULTS import in provider test ([1f49c28](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f49c2841a72d8b726ba8f8643bbc94a7244d091))
* **mcp:** update tool count assertion for ERC-8004 tools ([d010926](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d01092636af2675e72f7b369ee85ca0be3e35cc6))
* resolve lint and typecheck errors in ERC-8004 test files ([c6d0ff7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6d0ff7004ff55baecf73badeb15677cad1b77e6))
* update daemon test assertions for ERC-8004 schema changes ([8d768e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8d768e0f8e7ebad2850d96d97b494b73ed8c078e))
* update enum SSoT expected counts for ERC-8004 additions ([fcaf06b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fcaf06b42f125d66546c9db5290d4b05807aac9f))
* update test assertions for ERC-8004 additions ([5ee99cb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5ee99cbb5616c9dd5d69fb6bf1d40097fe8eba1f))
* **v30.8:** wire ERC-8004 notification events and cache invalidation ([a301333](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a301333587498b3d335017abc8fa9a4dbcaaaf1c))

## [2.10.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.10.0-rc...v2.10.0-rc.1) (2026-03-04)


### Features

* **314-01:** add AccountType enum and extend wallet schemas ([fa873e3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fa873e3723e953fc6ab54a9aa79a1b325ff281b1))
* **314-01:** extend Drizzle schema, add DB migration v38, create SmartAccountService ([5db4991](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5db4991dd0bc7bd62d8d0a3c7b0cf28e0aff5ade))
* **314-02:** add smart_account Admin Settings (25 definitions, chain-specific overrides) ([6a65b25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6a65b25d5bd2b9b3046549dba9ed139a9717d104))
* **314-02:** register smart_account keys in HotReloadOrchestrator ([4186d26](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4186d2600eebb9796eca23c6832f15cea3fadea1))
* **314-03:** extend wallet creation API for smart account support ([610905d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/610905d6060a627c3e04ef824d46f60819204a0c))
* **315-01:** add BundlerClient/PaymasterClient factory + ERC-4337 error codes + PipelineContext accountType ([af312f8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/af312f86f23d0373fbefae13e3a11f28ed44037d))
* **315-02:** add UserOperation execution path to stage5Execute with accountType branching ([cacc7ec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cacc7eca6d2b989908a5fe0917520fb28280effa))
* **315-03:** add BATCH atomic execution + lazy deployment + atomic response field ([6428492](https://github.com/minhoyoo-iotrust/WAIaaS/commit/64284929ba26d2ce6882f06d6cf0cb799197cd0a))
* **315-04:** add Paymaster integration tests for gas margin and rejection handling ([1b3365a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1b3365a0a0b07070cb9315c6d540115688bab2c5))
* **316-01:** add --account-type CLI option and SDK createWallet method ([70157e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/70157e0fdca68da6da3776335ded5ada685c2454))
* **316-02:** MCP smart account fields + Admin UI account type selector + System settings ([2a59113](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a591137d9cfea1d0b3db3e320d4ffcd6a4f9767))
* **316-03:** update skill files with ERC-4337 smart account documentation ([66a9f4e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/66a9f4ed6fdf4dc78046df6791d224ae0980c88b))


### Bug Fixes

* **316:** revise plans based on checker feedback ([e67b6af](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e67b6afc3c86957e8a2205e5f8b2fc35f8187887))

## [2.10.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.1-rc...v2.10.0-rc) (2026-03-04)


### Features

* **309-01:** add DryRunSimulationResult Zod SSoT schema with 12 warning codes ([0d1000d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d1000ddfc85385b35f51c94047f3354b1a53d99))
* **309-01:** add executeDryRun pipeline with zero side effects ([54a83a3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54a83a35588db5df83f6beea52ded3a1a0985e5d))
* **309-02:** add POST /v1/transactions/simulate REST API route ([6fe43ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6fe43ac3f03d437f9b1ebf28d236014a78d57216))
* **309-02:** add SDK simulate() + MCP simulate_transaction tool ([59368d0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/59368d09bd5aefa840a857e1f54f154a1e42b4e3))
* **310-01:** add 11 new audit events + unify existing 9 raw SQL to insertAuditLog ([7d91d85](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d91d856e38c27378b0c75127d4d659ab5b28252))
* **310-01:** add AuditEventType Zod SSoT (20 events) + insertAuditLog helper + DB migration v36 ([dca30bc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dca30bc9f6205bf973675d98987b366532ded7f2))
* **310-02:** GET /v1/audit-logs cursor-paginated query API ([931fb38](https://github.com/minhoyoo-iotrust/WAIaaS/commit/931fb38e919b2cd46450a1d840e2675cf645d015))
* **311-01:** add EncryptedBackupService + binary archive format ([6fed576](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6fed576ce3577c2142e6d410f1bc34baf6197ee0))
* **311-01:** add POST /admin/backup + GET /admin/backups REST API ([71a9708](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71a970859cd8944ab8c2e7c6c8d51e4df2fdedbf))
* **311-02:** add waiaas backup create/list/inspect CLI commands ([2e1bc8e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2e1bc8ea4fbd9d4ab02704e62a744f4afd26d4ba))
* **311-02:** add waiaas restore --from CLI command with safety checks ([ea2101d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ea2101d284dba8335e3c6bae8c584a364d1c6cf8))
* **311-03:** add BackupWorker auto-scheduler in daemon lifecycle ([e838fdd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e838fdda5789643d3946d56f12f932bb8302d8cd))
* **312-01:** add webhook Zod schemas, DB migration v37, WEBHOOK_NOT_FOUND error ([e65ef07](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e65ef073a8512e0d6ab8951b96c4dd840c4967ca))
* **312-01:** add WebhookService + WebhookDeliveryQueue with HMAC-SHA256 signing ([7f5eaec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f5eaec542df7550725dfef83684b58b95ff7dd8))
* **312-02:** add webhook CRUD REST API (POST/GET/DELETE /v1/webhooks) ([cbad80e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cbad80e981cfc8836163dc8270b6511cde524e55))
* **312-03:** add GET /v1/webhooks/:id/logs delivery logs API ([50afae8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/50afae8cb92115fc96b58afe35a4501176676dd2))
* **312-03:** integrate WebhookService with EventBus and daemon lifecycle ([6ecb07c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6ecb07cd26ecec60e7f5d8c6d1137dcd43650d9f))
* **313-01:** add IAutoStopRule interface, RuleRegistry, and admin stats Zod schemas ([d900938](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d900938262ba3e7c3519900ae29a2323936a70fd))
* **313-01:** refactor 3 AutoStop rules to IAutoStopRule + RuleRegistry-based service ([7740880](https://github.com/minhoyoo-iotrust/WAIaaS/commit/774088048440b418c525dec50cec90258ee97a43))
* **313-02:** add GET /admin/stats endpoint and daemon lifecycle wiring ([fd35260](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd352605729f2d98f0f333557806d9c287b56ee0))
* **313-02:** add IMetricsCounter interface, InMemoryCounter, and AdminStatsService ([d21ec8d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d21ec8d1c70009b99c90d8150d0a258d64a36029))
* **313-03:** add Admin UI dashboard stats cards with 30s polling ([21fb974](https://github.com/minhoyoo-iotrust/WAIaaS/commit/21fb974ac7a4df41df3f8a33919f4f8bd26f6229))
* **313-03:** add AutoStop rules REST API, per-rule settings, and hot-reload wiring ([ea29597](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ea295979c871ec95950f85c5ccca8ec0eb1cef1f))
* **313.1-01:** wire InMemoryCounter into production code (STAT-02/STAT-04) ([d871f93](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d871f934ca15f40efb18a9b5854867fdb0753d45))


### Bug Fixes

* **313.1-01:** fix schema version assertions and sync admin skill file ([b3e13de](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3e13def2270b2d3a1c554df232ed03166326ae9))
* **admin:** add missing fetchDisplayCurrency mock to dashboard tests ([dccba57](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dccba571e9ef579a8fba0026fca630f81adf02b7))
* **v30.2:** resolve 63 test assertion failures and 7 lint errors ([64d8b2b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/64d8b2b480b6bc47ad48665a7ced6076d340eec4))

## [2.9.1-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0...v2.9.1-rc) (2026-03-03)


### Bug Fixes

* **#246:** resume pipeline after APPROVAL tier owner sign-off ([1009933](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10099331f1d440045fe70ab0be1006dcbb795380))

## [2.9.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.19...v2.9.0) (2026-03-03)


### Bug Fixes

* promote v2.9.0-rc.19 to stable 2.9.0 ([92c084b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/92c084b2ed469bdc971c879ec5b76470881e31a1))

## [2.9.0-rc.19](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.18...v2.9.0-rc.19) (2026-03-03)


### Bug Fixes

* **daemon:** resolve approval channel issues ([#244](https://github.com/minhoyoo-iotrust/WAIaaS/issues/244), [#245](https://github.com/minhoyoo-iotrust/WAIaaS/issues/245)) ([bf89650](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf8965078c52fb5f93e3bbb60fd4e84bcb0c511d))
* **daemon:** resolve approval channel issues ([#244](https://github.com/minhoyoo-iotrust/WAIaaS/issues/244), [#245](https://github.com/minhoyoo-iotrust/WAIaaS/issues/245)) ([e0585d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0585d2f25cc4a38c3e04c9af7906cf837b3c4ff))
* **push-relay:** exclude bin.ts from coverage measurement ([1b305b9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1b305b9c67ccfc96bc4f1c1cde35c8905a8828d6))
* **push-relay:** handle ntfy file attachment for messages exceeding size limit ([#243](https://github.com/minhoyoo-iotrust/WAIaaS/issues/243)) ([e29ca3f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e29ca3fd7368b239235698c35ac0053fb79be495))
* **wallet-sdk:** handle ntfy file attachment in SSE subscribers ([#243](https://github.com/minhoyoo-iotrust/WAIaaS/issues/243)) ([192cb46](https://github.com/minhoyoo-iotrust/WAIaaS/commit/192cb46b5ae755dc168eb7c9ab36418b2dc8ade1))

## [2.9.0-rc.18](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.17...v2.9.0-rc.18) (2026-03-02)


### Bug Fixes

* **daemon:** RFC 2047 encode non-ASCII ntfy Title header to prevent silent failure ([#242](https://github.com/minhoyoo-iotrust/WAIaaS/issues/242)) ([a3eae46](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a3eae4677c5c6d7a742234b319edb7bcb44ebfba))
* **push-relay:** replace fetch() with node:http + explicit zlib decompression for SSE ([#243](https://github.com/minhoyoo-iotrust/WAIaaS/issues/243)) ([7622768](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7622768334626c76d61d1635ef3a21293ffa3e4e))
* **push-relay:** replace undici fetch with node:http SSE + explicit zlib decompression ([#243](https://github.com/minhoyoo-iotrust/WAIaaS/issues/243)) ([0ec502c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0ec502c3201b016d653c9d82097b2ae14762bcca))
* **wallet-sdk,push-relay:** align registerDevice field name and catch provider errors ([6adf2d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6adf2d1164ce98652bac35d56ba97135993163ed))

## [2.9.0-rc.17](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.16...v2.9.0-rc.17) (2026-03-02)


### Bug Fixes

* **push-relay,daemon:** device-topic unicast routing and test notification device guard ([#240](https://github.com/minhoyoo-iotrust/WAIaaS/issues/240), [#241](https://github.com/minhoyoo-iotrust/WAIaaS/issues/241)) ([93aad14](https://github.com/minhoyoo-iotrust/WAIaaS/commit/93aad144a8af975f49ea9b29a052bec8114e9bea))
* **push-relay,daemon:** device-topic unicast routing and test notification device guard ([#240](https://github.com/minhoyoo-iotrust/WAIaaS/issues/240), [#241](https://github.com/minhoyoo-iotrust/WAIaaS/issues/241)) ([5402372](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5402372ffffea735eae2ba67af1e0a019393d473))


### Code Refactoring

* **push-relay:** extract topic routing logic into testable message-router module ([7125f25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7125f2538956111875c44c391abaa2cfecac9ec7))

## [2.9.0-rc.16](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.15...v2.9.0-rc.16) (2026-03-02)


### Bug Fixes

* **daemon:** send test notification in base64url JSON format for Push Relay compatibility ([#239](https://github.com/minhoyoo-iotrust/WAIaaS/issues/239)) ([243af53](https://github.com/minhoyoo-iotrust/WAIaaS/commit/243af53ed84ab3ba8ee3b307bf90daf32d481b7b))
* **push-relay:** replace node:http SSE with fetch() for automatic decompression ([#238](https://github.com/minhoyoo-iotrust/WAIaaS/issues/238)) ([703858c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/703858c34c0db7128dc7d95d2f01336f3bc9ac8d))
* **push-relay:** resolve SSE decompression + test notification format ([#236](https://github.com/minhoyoo-iotrust/WAIaaS/issues/236), [#237](https://github.com/minhoyoo-iotrust/WAIaaS/issues/237), [#238](https://github.com/minhoyoo-iotrust/WAIaaS/issues/238), [#239](https://github.com/minhoyoo-iotrust/WAIaaS/issues/239)) ([209a6b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/209a6b5c4821c299db43676042007bf8fd97e631))

## [2.9.0-rc.15](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.14...v2.9.0-rc.15) (2026-03-02)


### Bug Fixes

* **push-relay:** replace undici fetch with node:http SSE + dynamic topic subscription ([#236](https://github.com/minhoyoo-iotrust/WAIaaS/issues/236), [#237](https://github.com/minhoyoo-iotrust/WAIaaS/issues/237)) ([a05fc33](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a05fc3352159d75c16cadaad89b205ec67d724b9))
* **push-relay:** replace undici fetch with node:http SSE + dynamic topic subscription ([#236](https://github.com/minhoyoo-iotrust/WAIaaS/issues/236), [#237](https://github.com/minhoyoo-iotrust/WAIaaS/issues/237)) ([70bc535](https://github.com/minhoyoo-iotrust/WAIaaS/commit/70bc53588679a99f62e4abe2c1c4d75cbcfa51b2))

## [2.9.0-rc.14](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.13...v2.9.0-rc.14) (2026-03-02)


### Bug Fixes

* **push-relay:** replace Content-Encoding header check with magic-bytes compression detection ([#236](https://github.com/minhoyoo-iotrust/WAIaaS/issues/236)) ([55fbfdf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/55fbfdf5d6135f9ded30ac0219173021e7717ed4))
* **push-relay:** replace Content-Encoding header check with magic-bytes compression detection ([#236](https://github.com/minhoyoo-iotrust/WAIaaS/issues/236)) ([1158789](https://github.com/minhoyoo-iotrust/WAIaaS/commit/11587892a29438b9335a4d485eb8ee178842e515))

## [2.9.0-rc.13](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.12...v2.9.0-rc.13) (2026-03-02)


### Features

* **wallet-sdk:** add Push Relay device registration helpers ([#233](https://github.com/minhoyoo-iotrust/WAIaaS/issues/233)) ([934dcfd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/934dcfda1093dea6f3282f6fc33b1ee60b6456eb))


### Bug Fixes

* **push-relay:** resolve DeviceRegistry UNIQUE migration and SSE decompression ([#234](https://github.com/minhoyoo-iotrust/WAIaaS/issues/234), [#235](https://github.com/minhoyoo-iotrust/WAIaaS/issues/235)) ([312963d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/312963df84330b7ed1e247da35d9a307dd230529))
* **push-relay:** resolve issues [#233](https://github.com/minhoyoo-iotrust/WAIaaS/issues/233), [#234](https://github.com/minhoyoo-iotrust/WAIaaS/issues/234), [#235](https://github.com/minhoyoo-iotrust/WAIaaS/issues/235) ([10de881](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10de881ee3f1bec45a6e5eadd964e58923916ee5))

## [2.9.0-rc.12](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.11...v2.9.0-rc.12) (2026-03-02)


### Features

* add wallet_type/name separation and subscription token routing ([#230](https://github.com/minhoyoo-iotrust/WAIaaS/issues/230), [#231](https://github.com/minhoyoo-iotrust/WAIaaS/issues/231)) ([f9e94aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9e94aa393cd86dbfeb1e6cc8d9b970066eed87f))


### Bug Fixes

* remove duplicate ntfy server URL from Human Wallet Apps page ([#232](https://github.com/minhoyoo-iotrust/WAIaaS/issues/232)) ([2ba21a2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2ba21a24186fe47269241d5f3a24d50e39332e1e))
* remove empty body from wallet app test notification request ([d849713](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d84971321ae1b19475baacfd589b1391024b51a4))
* resolve open issues [#230](https://github.com/minhoyoo-iotrust/WAIaaS/issues/230), [#231](https://github.com/minhoyoo-iotrust/WAIaaS/issues/231), [#232](https://github.com/minhoyoo-iotrust/WAIaaS/issues/232) ([192d41c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/192d41c38763d7f4efc28f8e97dcfdec3ba19d74))

## [2.9.0-rc.11](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.10...v2.9.0-rc.11) (2026-03-02)


### Bug Fixes

* move wallet app notification toggle to Human Wallet Apps page ([#229](https://github.com/minhoyoo-iotrust/WAIaaS/issues/229)) ([327f887](https://github.com/minhoyoo-iotrust/WAIaaS/commit/327f887e471796f5c3712f0c1a757726dec266db))
* move wallet app notification toggle to Human Wallet Apps page ([#229](https://github.com/minhoyoo-iotrust/WAIaaS/issues/229)) ([d4b9e39](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4b9e39e9a1bb81843856d78b163d1baabbdbd30))
* update settings tests for notification subgroup removal ([0d8e70f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0d8e70f1b83a687d302f07811f0311eea0ecd659))

## [2.9.0-rc.10](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.9...v2.9.0-rc.10) (2026-03-02)


### Bug Fixes

* ntfy Channel Status shows per-wallet topic count ([#228](https://github.com/minhoyoo-iotrust/WAIaaS/issues/228)) ([7664430](https://github.com/minhoyoo-iotrust/WAIaaS/commit/76644307c623390560d5a4d0152128d1a9d78ce7))
* ntfy Channel Status shows per-wallet topic count ([#228](https://github.com/minhoyoo-iotrust/WAIaaS/issues/228)) ([7c2a53a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c2a53abe7f21383978ce354db6802cd96c33a92))

## [2.9.0-rc.9](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.8...v2.9.0-rc.9) (2026-03-02)


### Features

* **302-01:** add sign_topic/notify_topic columns to wallet_apps (migration v33) ([b71a363](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b71a36377f6f1642842c9ef3eddb7906daa957a6))
* **302-01:** add topic fields to WalletAppService/REST API and remove global ntfy_topic setting ([4934613](https://github.com/minhoyoo-iotrust/WAIaaS/commit/49346132823dfccd4f4cb1ee7e0dc9d949585c82))
* **302-02:** switch channel topic sources to wallet_apps DB and remove global NtfyChannel ([78bdcb7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/78bdcb77c9f6e1c3a3e58d1ca6aff8a1906b3956))
* **303-01:** add sign_topic/notify_topic display and edit to Human Wallet Apps ([7d22702](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7d22702980ea47feb0bf30911b914df26c0964c1))
* **303-01:** remove ntfy_topic field from Notifications, add per-wallet topic guidance ([9fd9ff0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9fd9ff070741115c0f109558b40e816b78fd7a52))


### Bug Fixes

* reorder Admin UI nav — Human Wallet Apps before Security ([7bc9108](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7bc9108c3f52787513eb8e05f6c600ab89e81cb4))
* resolve 3 open issues ([#222](https://github.com/minhoyoo-iotrust/WAIaaS/issues/222), [#226](https://github.com/minhoyoo-iotrust/WAIaaS/issues/226), [#227](https://github.com/minhoyoo-iotrust/WAIaaS/issues/227)) ([718a8b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/718a8b0f2ee6ba6d55b3ef8247f757d7cddc3634))
* resolve 4 open issues ([#222](https://github.com/minhoyoo-iotrust/WAIaaS/issues/222)-[#225](https://github.com/minhoyoo-iotrust/WAIaaS/issues/225)) ([3e0bd42](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e0bd42bcd4164874a33375aa1fcc3e37dacdc27))

## [2.9.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.7...v2.9.0-rc.8) (2026-03-02)


### Features

* complete Phase 300 session progressive security model (v29.9) ([6fccd39](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6fccd397d6b8443d5dc5d55154f834fd4d1b03c4))
* implement per-session TTL with unlimited sessions by default (Phase 300) ([709828f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/709828f3ba1471eb343084a1adf99956a999c55f))
* update all integration layers for session progressive security (Phase 301) ([3cdf5ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3cdf5ff6d4c3dc1adb4eac1807989dd37362a1d3))
* update skill files and fix tests for session progressive security (Plan 301-7) ([f3ee4b2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f3ee4b2a21362662ba3769b13a0887b49d44b73f))

## [2.9.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.6...v2.9.0-rc.7) (2026-03-02)


### Features

* expose Push Relay server version via health endpoint, startup log, and --version flag ([#220](https://github.com/minhoyoo-iotrust/WAIaaS/issues/220)) ([779c30e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/779c30e045ca3c50d2e6499a9cb9bf715865de3e))


### Bug Fixes

* align SignRequestSchema chain enum with ChainTypeEnum SSoT ([#221](https://github.com/minhoyoo-iotrust/WAIaaS/issues/221)) ([062c4d5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/062c4d59cfb57c4d0d23b8f73115bbb670cd645c))
* resolve open issues [#220](https://github.com/minhoyoo-iotrust/WAIaaS/issues/220) and [#221](https://github.com/minhoyoo-iotrust/WAIaaS/issues/221) ([5692b04](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5692b04335603788179205f5eb620874494d15ea))

## [2.9.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.5...v2.9.0-rc.6) (2026-03-02)


### Features

* **297-01:** add IPerpProvider interface and Zod schemas ([774e9aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/774e9aafce347e0a8f9c58401fa9487f3e4b0ad4))
* **297-01:** add MarginWarningEvent, perp policy types, and TransactionParam extensions ([4fd7528](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4fd7528e0077348788f23e9bfff9b483d69057c2))
* **297-02:** add MarginMonitor for perp position margin ratio monitoring ([e893f11](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e893f1129339a7224e8f378425b517eb99e2c18c))
* **297-02:** add perp policy evaluation (Step 4i) to DatabasePolicyEngine ([445987c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/445987ca15b39c1d60fab40faf4f0da4b829cdc2))
* **298-01:** add DriftConfig type and 5 Zod input schemas for Drift perp actions ([80caef6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/80caef6a5fc0be2b6b0ee24cde134b50a3c3ee74))
* **298-01:** add IDriftSdkWrapper interface with MockDriftSdkWrapper and DriftSdkWrapper stub ([f90f741](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f90f7418a3ac0ad4767f6890cf5b7b1cdb435236))
* **298-02:** add DriftMarketData helper class ([1f3cad9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1f3cad9ed7ded69c0d1e6082c2772d6c99f855f5))
* **298-02:** add DriftPerpProvider with 5 perp actions + IPerpProvider + IPositionProvider ([7ec1117](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7ec1117e010bf4d0bde4dc3c6240a0671631b1dd))
* **299-01:** register DriftPerpProvider in registerBuiltInProviders ([374526a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/374526a219e0213afbd227e2469ff6040fe668b1))
* **299-02:** add Drift Perp card and advanced settings to Admin UI Actions page ([8741744](https://github.com/minhoyoo-iotrust/WAIaaS/commit/87417444027871278c14eca4bd7d8a48b850b016))
* add WAIaaSClient.connect() for auto-discovery and auto-start ([#218](https://github.com/minhoyoo-iotrust/WAIaaS/issues/218)) ([ca41ecf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca41ecf3018e403e87daee549aa2612c98d9ade9))


### Bug Fixes

* **299-01:** add pendle_yield and drift_perp to BUILTIN_NAMES for hot-reload ([e868ba8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e868ba8802da562bc1b9f6bf0bdbebe9144dd1f3))
* move push-relay shutdown timer inside shutdown handler ([#219](https://github.com/minhoyoo-iotrust/WAIaaS/issues/219)) ([40f974a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/40f974a5f6f44d903c34cebf59b0c411c800d72d))
* update PolicyType expectedCount to 17 in enum SSoT verifier ([fb681f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fb681f6906cc9a7c0067f5cc76f75ce8db9f3abb))
* update settings count assertions for 5 Drift Admin Settings keys ([204e25f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/204e25f3ee16ad0c87e2e6568e2745f251d88622))
* update test assertions for Drift Perp provider additions ([dfcfb2a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dfcfb2ac96aa60e7382da6f9e748a9b48a2908eb))

## [2.9.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.4...v2.9.0-rc.5) (2026-03-01)


### Features

* **291-01:** change D'CENT preset to sdk_ntfy and add wallet_type topic routing ([d38a619](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d38a6196c61b6ae283fc06e84e362bf58bca6dc9))
* **292-01:** add Wallet Type UI controls and conditional WalletConnect display ([0444cd2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0444cd2735078c9a01e98ab3e6c70d009997e963))
* **293-01:** add wallet_apps DB table, WalletAppService CRUD, signing blocking, preset auto-registration ([3e751de](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e751decd4e1cc0b93fbad1cc9c661f744b05f78))
* **293-02:** add REST API endpoints for wallet apps CRUD ([17156cb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17156cb6cb4a747d74a76949d0e5e2f2a8a754bd))
* **294-01:** convert WalletNotificationChannel to app-based topic routing ([1cca54a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1cca54ae1eb9d7b0cb93653d5b43698ae982b167))
* **295-01:** separate ntfy into independent FieldGroup in Notifications Settings ([b1e6ff0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b1e6ff0e0099ad49d0a6e4b51b5723cf57f44105))
* **admin:** add Human Wallet Apps page with registry and ntfy settings ([00d5aa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/00d5aa3cc5c8c87ecd76548ad626da6fbbff1b76))


### Bug Fixes

* **292:** revise plans based on checker feedback ([40ccf20](https://github.com/minhoyoo-iotrust/WAIaaS/commit/40ccf20cdc542445370857f6f264c2f73dfd6a7a))
* remove unused variable in wallet-app-service test ([84c2883](https://github.com/minhoyoo-iotrust/WAIaaS/commit/84c28833bd8f174948724ae4f794f45b973f0d44))
* update D'CENT preset approval_method in tests (walletconnect → sdk_ntfy) ([5fb699a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5fb699ab2261c94110c9d32f09ac5eaaef6d8bc3))
* update error code counts for v29.7 new codes ([908900c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/908900c4983e368d423f94781c4914630638ae9f))

## [2.9.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.3...v2.9.0-rc.4) (2026-03-01)


### Features

* add IYieldProvider interface and MATURED position status (Phase 288) ([acffa04](https://github.com/minhoyoo-iotrust/WAIaaS/commit/acffa040028c56f02caf5cf1a1faf324db99d2a4))
* add MaturityMonitor service and complete Phase 290 ([7f9ab6c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f9ab6c7aa0c6695643869f5deea8d2bb0e02948))
* add Pendle integration infrastructure (Phase 290 partial) ([82de326](https://github.com/minhoyoo-iotrust/WAIaaS/commit/82de326abe2bb4c0453f6a1227046ec6abf63b27))
* add PendleYieldProvider with API client and 5 yield actions (Phase 289) ([44d13ed](https://github.com/minhoyoo-iotrust/WAIaaS/commit/44d13edf67778422fdbce40d916f6df87d96a306))
* **mcp:** add npm keywords and MCP Registry server.json for agent discovery ([399ded6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/399ded66713d26637589c54041eb9c48be6d9890))


### Bug Fixes

* resolve Solana WSS URL prefix and Lido factory errors ([#216](https://github.com/minhoyoo-iotrust/WAIaaS/issues/216), [#217](https://github.com/minhoyoo-iotrust/WAIaaS/issues/217)) ([57f1502](https://github.com/minhoyoo-iotrust/WAIaaS/commit/57f1502e02cf8fa60134d28d17de19735c4d2e4c))
* update Admin UI action provider count from 7 to 8 (Pendle added) ([897171f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/897171fda162e4df7b75ef3529f5d2adb9901373))
* update test assertions for v29.6 setting definitions and sort order ([30b2873](https://github.com/minhoyoo-iotrust/WAIaaS/commit/30b287319c9c45b9d0b33ba1cb96d39757f8cd56))

## [2.9.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.2...v2.9.0-rc.3) (2026-02-28)


### Features

* **#215:** add Push Relay sign response relay endpoint + sendViaRelay SDK function ([71ab2fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71ab2fdbc7d418ce5f954d8cd96626e02e413dac))
* **285-01:** add v28 migration to move api_keys to settings table ([d4ff31b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4ff31b530a648326a585f3f317c7ea8bfb7599d))
* **285-01:** delegate admin API key routes to SettingsService ([9362c3a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9362c3af36cb318cf9e61b412ef08600cb7d2b0a))
* **285-02:** add setApiKey bypass, migrate tests, update admin routes ([6911e02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6911e02313966ea220546439ebbc469f6fed03e1))
* **285-02:** remove ApiKeyStore, fix hot-reload, update action route guard ([1eef92a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1eef92ab7d70843d468f99a9bb1c3d00d20a35dd))
* **286-01:** add DB migration v29 for Solana network ID renaming ([c63fb1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c63fb1b1103ecb9d97fd82ce23c2bf61d5609aff))
* **286-01:** rename Solana network SSoT constants to solana-{network} format ([c654802](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c654802698839996deed1893ca604cbd32690b11))
* **286-01:** update CAIP mappings, explorer URLs, and RPC defaults for solana-{network} ([a5894ab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a5894ab9f851eb821bf4404599ca552fa13f54f2))
* **286-02:** update infrastructure layer for solana-{network} format ([26d8187](https://github.com/minhoyoo-iotrust/WAIaaS/commit/26d8187bb996d9a589e6827d9b63d45c848e85f7))
* **286-03:** add legacy network name normalizer and NetworkTypeEnumWithLegacy ([a413522](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a413522bb1523173c8dbb812bb1cc2212af99685))
* **286-03:** update Admin UI network displays and skills file examples ([6bdbcc8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6bdbcc87306c33e6645ccfcbb33c11a820bbb6cc))


### Bug Fixes

* **286-03:** export normalizeNetworkInput and NetworkTypeEnumWithLegacy from enums index ([6c6a9e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c6a9e6aa680c460b4f6103a57932a587b198320))
* update Kamino skill examples to solana-mainnet and fix test name ([2c451e1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2c451e1282b665d93e707868d27eda2afa453e3d))

## [2.9.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc.1...v2.9.0-rc.2) (2026-02-28)


### Features

* **283-01:** add Kamino K-Lend provider scaffold with SDK wrapper ([dcab529](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dcab529a24f9542b3abd63746ca046fd82705fe6))
* **283-02,283-03:** add HF simulation module and register Kamino exports ([93ac61c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/93ac61cf1464b7f397f523208f0c0358314e0889))
* **284-01:** register Kamino in registerBuiltInProviders + 3 Admin Settings keys ([9832732](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9832732ba9d901453fb9fa5a6de165a7800d578b))
* **284-02:** wire PositionTracker provider registration after Step 4f ([89e5ad6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/89e5ad6648ec353dcd789c0ecbc140b3a6bbde95))
* **284-03:** multi-provider health factor aggregation + MCP/SDK verification ([958e61d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/958e61d03461aad5936b42d3f93ae392f3bdfdcf))
* **284-04:** add Kamino to Admin UI Actions page + update actions.skill.md ([eb75d2c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eb75d2c72123c0bb82003f13633927bb12768f10))


### Bug Fixes

* **284-03:** fix worstStatus type in health factor aggregation ([1df49ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1df49ac50c56a9d10e0c901283060e0659b8a70c))
* add missing listProviders mock in health-factor test ([6939e35](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6939e35e5dfabf62e60623bd5a06b5e77ac66a46))
* **lending:** use suffix matching for borrow action names in LTV policy ([cdd81f7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cdd81f7fdc0bc4fc07e25788a50376afe5def680))
* resolve 3 open issues ([#210](https://github.com/minhoyoo-iotrust/WAIaaS/issues/210), [#212](https://github.com/minhoyoo-iotrust/WAIaaS/issues/212), [#213](https://github.com/minhoyoo-iotrust/WAIaaS/issues/213)) ([5e66eaa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5e66eaa9b656e652e9d610af228b2c75a047ce8e))

## [2.9.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.9.0-rc...v2.9.0-rc.1) (2026-02-27)


### Bug Fixes

* **test:** increase JWT expiry window in Chain 5 security test for CI stability ([a6f4b30](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a6f4b305f8cae1b1b642324ac8a03a4ef8431e51))

## [2.9.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0...v2.9.0-rc) (2026-02-27)


### Features

* **280-03:** remove defaultNetwork from services, settings, and fix all tests ([64e2acc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/64e2accd51d4d5d0a980f11cbb0522f3f3a30c78))


### Bug Fixes

* **281-02:** delete set_default_network MCP tool and remove registration ([0bc9290](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0bc9290da01e72a0fde263a44108a2db7860d296))
* **281-02:** update wallet_id and network descriptions in all 24 MCP tools ([8f77c9f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8f77c9f8b495c50101174e8618306f1badb78b1a))
* **281-03:** update skill files to remove default network/wallet references ([908dd90](https://github.com/minhoyoo-iotrust/WAIaaS/commit/908dd9079915fc3f1f8656962f02e71e59ac1499))
* **282-02:** remove defaultNetwork/isDefault/evm_default_network from test files ([24eda31](https://github.com/minhoyoo-iotrust/WAIaaS/commit/24eda319e3ada93e30d2352c56fab1856abb5f6a))
* **282-02:** resolve lint errors from unused variables after default removal ([73cb52b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/73cb52b7be9cc115a20bb524a1928aa77f5aeb3a))
* **ci:** remove wallets.default_network from enum SSoT verification ([d26ea9b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d26ea9b95f2421ffd5495d6c7756aee67fccbac7))
* **ci:** revert CLI coverage threshold to 77% -- CI environment yields lower coverage than local ([a815815](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a81581551e9e85ced13b6b7b8f403ddb8d5f856b))
* pass this.notificationService to re-entry PipelineContext. ([c3fa0d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3fa0d6c3cdb858f06755df9d81c4c81678a50ef))
* **pipeline:** restore original request on DELAY/GAS_WAITING re-entry and add notificationService ([#207](https://github.com/minhoyoo-iotrust/WAIaaS/issues/207), [#208](https://github.com/minhoyoo-iotrust/WAIaaS/issues/208)) ([c3fa0d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3fa0d6c3cdb858f06755df9d81c4c81678a50ef))
* **test:** update Docker platform test for 3-stage build structure ([902a38c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/902a38c5b6589358f0d55aaf7987da97b7fc19dc))


### Code Refactoring

* **281-01:** remove default network/wallet types and methods from Python SDK ([46d34b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46d34b70593452565bb4ead6acce27f15d0e4662))
* **281-01:** remove default wallet/network types and methods from SDK ([3ff7853](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3ff785378b10645bacca84edb6fcf7f611465689))
* **281-01:** remove set-default-network command and defaultNetwork from CLI ([9868f1a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9868f1af1fe788f08ffea7be7de226be7149594d))
* **281-03:** remove default network UI and evm_default_network from wallets page ([8884ff0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8884ff0c9b782e1ac90af6168dcd5bcf72a54fb3))
* **281-03:** remove defaultWalletId and evm_default_network from sessions, settings, helpers ([3981599](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3981599b2551c3d63f9ed66baf22df5cecf226a9))

## [2.8.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0...v2.8.0) (2026-02-27)


### Bug Fixes

* deterministic Docker build for native addons ([4e9e545](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e9e54515dd8a8814b53aa2fbd82190c3e9fa43c))
* use prod-deps stage for deterministic Docker native addon builds ([911ee16](https://github.com/minhoyoo-iotrust/WAIaaS/commit/911ee1663a2be036ae15c9c5943ac1be878929c1))

## [2.8.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0...v2.8.0) (2026-02-27)


### Bug Fixes

* deterministic Docker build for native addons ([4e9e545](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4e9e54515dd8a8814b53aa2fbd82190c3e9fa43c))
* use prod-deps stage for deterministic Docker native addon builds ([911ee16](https://github.com/minhoyoo-iotrust/WAIaaS/commit/911ee1663a2be036ae15c9c5943ac1be878929c1))

## [2.8.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0-rc.4...v2.8.0) (2026-02-27)


### Bug Fixes

* promote v2.8.0-rc.4 to stable 2.8.0 ([f864587](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f8645870232bff167cc7a062281226383fa70a38))

## [2.8.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0-rc.3...v2.8.0-rc.4) (2026-02-27)


### Bug Fixes

* add BackgroundWorkers isRunning tests for coverage margin ([97a6ce5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/97a6ce5cd7a6fe338d4fe036580d3f10cbda1bf5))

## [2.8.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0-rc.2...v2.8.0-rc.3) (2026-02-27)


### Bug Fixes

* register missing position_tracker.enabled setting key and restore test coverage ([4b9cdee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4b9cdeea7bdc332e8abe3a74692cf3173fb8772a))

## [2.8.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0-rc.1...v2.8.0-rc.2) (2026-02-27)


### Features

* **274-01:** add DeFi SSoT enums, notification events, and i18n templates ([431c31c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/431c31cd035988e1f36f401e1f77a65a754c69d3))
* **274-02:** add defi_positions table migration v25 and Drizzle schema ([7950883](https://github.com/minhoyoo-iotrust/WAIaaS/commit/795088385ec968a16c49ec5a01cfc60adc4f22a4))
* **274-03:** add ILendingProvider and IPositionProvider interfaces ([a34371f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a34371f75ef422d2947271c2b4039e046dcea2a8))
* **275-01:** add IDeFiMonitor interface, PositionWriteQueue, PositionTracker, DeFiMonitorService ([96d3864](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96d38644fbff989c3ed07c5e64c1d0fe13668fc8))
* **275-01:** daemon lifecycle integration + PositionTracker/WriteQueue unit tests ([a455dc0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a455dc040141513ba03690caf9805251d5a26e0e))
* **275-02:** add HealthFactorMonitor with adaptive polling and severity alerts ([493d372](https://github.com/minhoyoo-iotrust/WAIaaS/commit/493d37224db189b258fb874eccd7778f1f865ce7))
* **275-03:** add lending policy evaluation to DatabasePolicyEngine with 18 unit tests ([2bd8f15](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2bd8f15d33c995d294a1ac78c160ebf5f04a0bc6))
* **275-03:** extend ContractCallRequestSchema with actionName, add lending policy types, v26 migration ([e7166b3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e7166b30deb2283c84c8016513aa2f3295f90a7e))
* **276-01:** add Aave V3 manual hex ABI encoding, 5-chain address registry, and Zod input schemas ([ba39474](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ba394747c6cf5518b8a016a009b4bd61ba164f97))
* **276-02:** add Aave V3 RPC response decoders, health factor simulation, and APY conversion ([1ad946e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ad946e24a1157edf8e2d99b3c2438c8e5eeae92))
* **276-03:** implement AaveV3LendingProvider with 4 actions + dual interface compliance ([3a8a9df](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3a8a9dfe7197bb550cf3b38a4617b5067a45720e))
* **276-03:** register AaveV3LendingProvider in registerBuiltInProviders + re-exports ([af1589d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/af1589d138d94f7f06a31187928ddf8650ec39b9))
* **277-01:** REST API endpoints for DeFi positions + health factor + IRpcCaller injection ([5bab769](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5bab769bd583f238bb134c8e4d967344810c070e))
* **277-02:** MCP tools + TS SDK + Python SDK for DeFi positions and health factor ([fbc8f76](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fbc8f76f29f7a268395b956728e945cbf3d191c2))
* **277-03:** update skill files with DeFi Lending documentation ([d6ca034](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6ca0346a64593bd125265e9edcd3400663137eb))
* **278-01:** add Aave V3 runtime settings + Actions card + service integration ([abc7e99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/abc7e99a4e735480562891312b733aa4c74de1ee))
* **278-02:** add Admin DeFi positions endpoint + Dashboard section ([0473be9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0473be9d37adf45090214a9d92cd3beefb5e8faf))
* implement auto-provision mode ([#200](https://github.com/minhoyoo-iotrust/WAIaaS/issues/200)) ([74f2288](https://github.com/minhoyoo-iotrust/WAIaaS/commit/74f22885888dabe8cdad837b95004d8dbcea6f20))


### Bug Fixes

* **275:** revise plans based on checker feedback ([5fa7fc6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5fa7fc6a7ab03f59100c460b9f0623bb657379a3))
* resolve 4 open issues ([#203](https://github.com/minhoyoo-iotrust/WAIaaS/issues/203), [#204](https://github.com/minhoyoo-iotrust/WAIaaS/issues/204), [#205](https://github.com/minhoyoo-iotrust/WAIaaS/issues/205), [#206](https://github.com/minhoyoo-iotrust/WAIaaS/issues/206)) ([4d8d2e9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d8d2e9d1350c34a5cdf72f0141f1a0448a8f0a1))
* resolve lint errors and typecheck issues in Aave V3 test files ([1cafc75](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1cafc7516e1f33ab544a53af2223f97703667fd6))
* resolve lint errors in re-encrypt test file ([76898ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/76898ee4988ece4925403dc9bc76bce5a83f735e))
* update enum SSoT expected counts for PolicyType (14) and NotificationEventType (49) ([fde9041](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fde9041a426141c5f06ad87c5ba6da407da74b0d))
* update pre-existing test assertions for notification event count and idle timeout behavior ([ac9c117](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ac9c117bf84af945469179cd1c0be52d86fa1b13))
* update test assertions for MCP tool count and EVM incoming subscriber mocks ([bed3881](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bed38813f04e4e52eb72c21501f62637d40e69c5))

## [2.8.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.8.0-rc...v2.8.0-rc.1) (2026-02-26)


### Features

* add `waiaas notification setup` CLI command ([#195](https://github.com/minhoyoo-iotrust/WAIaaS/issues/195)) ([45c5fc6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/45c5fc68235345cca63e73a7558d7587d8bace24))


### Bug Fixes

* **admin:** update RPC endpoint test mocks with builtinUrls field ([8a88136](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8a881360d6acc2dd2fdd5b521c7c8471397c4498))
* EVM incoming subscriber RPC pool integration + Admin UI API-based builtin URLs ([a2f274d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a2f274d05762413246bbe607ad960871752cac34))
* resolve issues [#196](https://github.com/minhoyoo-iotrust/WAIaaS/issues/196) [#197](https://github.com/minhoyoo-iotrust/WAIaaS/issues/197) [#198](https://github.com/minhoyoo-iotrust/WAIaaS/issues/198) [#199](https://github.com/minhoyoo-iotrust/WAIaaS/issues/199) — RPC pool bypass, Admin UI sync, docs ([e43ab71](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e43ab714939f33e2c061436084fda20473bcfa15))

## [2.8.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.7.0...v2.8.0-rc) (2026-02-26)


### Features

* builtin wallet preset auto-setup (v28.8) ([caab8f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/caab8f1a4226ec1008c9f709df2528094ee7e913))

## [2.7.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.7.0-rc.1...v2.7.0) (2026-02-25)


### Bug Fixes

* promote v2.7.0-rc.1 to stable 2.7.0 ([5af9198](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5af9198015f95a3abfeed46e76577c1698f72c0d))

## [2.7.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.7.0-rc...v2.7.0-rc.1) (2026-02-25)


### Features

* **260-01:** implement RpcPool with priority-based URL rotation and cooldown ([bdfcde2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bdfcde26ec644212a6694bbae761ee498388d561))
* **260-02:** add built-in RPC defaults and createWithDefaults factory ([97926b6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/97926b657c961a72c0e65bbdc54e6af8a615c16f))
* **261-01:** wire RpcPool into AdapterPool with config.toml seeding ([c0942cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c0942cc6ed259d014202168123dbde193366fc9b))
* **261-02:** add RpcPool cooldown reset to hot-reload RPC handler ([5dbe336](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5dbe3364810604ff74de2d90ee41e7737dd98fca))
* **261-03:** wire IncomingTxMonitor subscriberFactory to RpcPool ([e06f933](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e06f93395ced71074474c7ecd8c3e4a3dcd43cee))
* **262-01:** add RpcPool.replaceNetwork(), rpc_pool.* settings, and hot-reload handler ([2f167bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2f167bbc683c71be8477c6c2e772791e05cd54f6))
* **263-01:** add GET /admin/rpc-status endpoint and multi-URL RPC Endpoints tab ([4bb7b09](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4bb7b0919564cff3188a2837af209dd6583ec5fc))
* **263-02:** add live RPC pool status display and per-URL test buttons ([942d300](https://github.com/minhoyoo-iotrust/WAIaaS/commit/942d300d1e64c633e8a52b41a4a86a6d743346ca))
* **264-01:** add onEvent callback to RpcPool for cooldown/all-failed/recovered emission ([206253a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/206253a9d24a4e15d4c8e25a05e32353a375a999))
* **264-01:** add RPC_ALL_FAILED and RPC_RECOVERED notification events ([8f3d7e6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8f3d7e63fb75ea1aa77c864c7131b8014f217307))
* **264-02:** wire RpcPool onEvent to NotificationService and export RpcPoolEvent ([76eec32](https://github.com/minhoyoo-iotrust/WAIaaS/commit/76eec3245a68831883d55ebbb0c672df63d488d2))


### Bug Fixes

* **260:** export BUILT_IN_RPC_DEFAULTS from @waiaas/core barrel ([5b70017](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5b7001714658d55bf740727a0c6f009937c26a8c))
* **263-01:** remove unused vi import in admin-rpc-status test ([68a9a49](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68a9a49f63cf68f46dd7ee880d906fc7f091b542))
* guard against undefined rpcPoolStatus and update stale RPC tab tests ([c3e6ea8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3e6ea8c0018ac0942915f50d54b04e9bd9daf37))
* resolve lint error and type errors in RPC pool tests ([b4f516d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4f516d0d8aeddcfee173e74b4bfc65cbe56d1d1))
* update NotificationEventType expected count in enum SSoT verifier ([c572fb8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c572fb8925558fa13888b937ced1b935962d4669))
* update snapshot counts for new RPC pool events and settings ([9d6e433](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d6e433c9338469090984d675f0aacb938dcc87b))

## [2.7.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0...v2.7.0-rc) (2026-02-25)


### Features

* **258-01:** add Pipeline Stage 3.5 gas condition check with GAS_WAITING transition ([5d15401](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5d15401360fda526df5698df9ad42c7863e945fb))
* **258-02:** add gas_condition settings (5 keys) to SETTING_DEFINITIONS ([6ccd56d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6ccd56d353feb270628492030e61b59a4d31c7d4))
* **258-02:** add GasConditionTracker with EVM/Solana RPC gas price queries ([801ec94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/801ec9459bfbeb1d71b170f9f9c5b32b9a11445b))
* **258-02:** add resumePipeline callback and gas-condition COMPLETED handling ([aa4e328](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aa4e3282e95d6338b34746f70d2bae49c086696c))
* **258-02:** register GasConditionTracker and add executeFromStage4 ([4594501](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4594501a3664bd691143593d11c90c0c92bc752b))
* **259-01:** add Gas Condition section to Admin UI System page ([724caf2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/724caf221ee61ec68f24d8abec948f5b66c90ec1))
* **259-01:** add GasCondition OpenAPI schema and gas_condition settings category ([84ea5a5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/84ea5a5ffccc7c5e44072796e5cbdef4f41ec30c))
* **259-02:** add gas_condition parameter to MCP transaction tools ([6f6f12e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6f6f12eb2dd1782a0813cfa1ef264b3c5e85dd83))
* **259-02:** add gasCondition to MCP action_provider and Actions route ([2e1cce6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2e1cce678165616662927fdf273fa321f744436f))
* **259-02:** add gasCondition to TS SDK, Python SDK, and skill docs ([41f1cf1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/41f1cf1275cf0bbe4484f346610f1dc032d4ec4c))
* add GasCondition schema, notification events, and i18n (258-01 partial) ([23d2471](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23d2471f8c951707a02cfd14fc712d3414bc6041))


### Bug Fixes

* **#185:** add retry and timeout handling to EVM incoming subscriber ([a91ab1a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a91ab1a60793f0ddd6f0f1fee67dfb866e15a7d2))
* **#186:** correct LI.FI getQuote query parameter names ([bf10130](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bf101306478fc7b09a549fb1632a17ca558d0f91))
* **#187:** add retry logic for Solana mainnet RPC 429 rate limits ([08be559](https://github.com/minhoyoo-iotrust/WAIaaS/commit/08be55975404575f3f5bfa15547fa4be3c1079da))
* **#188:** resolve actions providers wildcard auth and admin UI improvements ([a12ab8e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a12ab8ea00037d8fbd31840538bba0b60aca5ffa))
* **258:** emit TX_CANCELLED notification on gas-condition timeout ([2784804](https://github.com/minhoyoo-iotrust/WAIaaS/commit/278480458874d389687831189abf4f7bb32b4443))
* **259:** revise plans based on checker feedback ([c66d776](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c66d77693f07dea95f1413305cdefa86733d1e88))
* **259:** update notification event type count from 38 to 42 ([0ae6381](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0ae63818c2b0ab2c82650fe4f7ba4594ef694671))
* remove unused CurrencyCode import in display-currency-helper test ([d222511](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d222511e3dbb7f8c632b1e1a1385cbf8790c70c1))
* update test expectations for dual-auth actions/providers endpoint ([62926ea](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62926ea1648e18b5f6bbc371e180b8a077d100b4))
* use regex matchers for action provider description tests ([aefff7f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aefff7f9e2f5130e0222b6a69d0c6c7383122b1d))

## [2.6.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.13...v2.6.0) (2026-02-24)


### Bug Fixes

* promote v2.6.0-rc.13 to stable 2.6.0 ([d5308d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5308d49c3375074e249c9568fc55fdf065eeda8))

## [2.6.0-rc.13](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.12...v2.6.0-rc.13) (2026-02-24)


### Features

* **254-01:** add Lido staking ABI encoding helpers and config ([1701463](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1701463dc1f76efe0e398211075d5db088635e37))
* **254-01:** implement LidoStakingActionProvider with unit tests ([a4c000a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a4c000acfe11a272d1c77c31168646a53789634f))
* **254-02:** register Lido staking in actions exports and SettingsService keys ([e58fcb7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e58fcb72bc47086d8b663083af8649c72c943b7a))
* **255-01:** add Jito staking config and SPL Stake Pool instruction encoding ([416dd4c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/416dd4c077135b4e0a1da343a2f09a51606f4e4b))
* **255-01:** add JitoStakingActionProvider with stake/unstake and 12 unit tests ([a3d533d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a3d533d2a2c4b23829695fff39b3c75a26d4e25f))
* **255-02:** register JitoStakingActionProvider in daemon + 3 SettingsService keys ([0c123bb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0c123bb16f411d1e8bdff1c98959fefcaaeb3164))
* **256-01:** add LidoWithdrawalTracker and JitoEpochTracker implementations ([57d2bb4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/57d2bb45a2ab95d06a293391a2ad5e9e1e691e01))
* **256-01:** add staking notification events, daemon tracker registration, and dynamic event dispatch ([503133d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/503133d950ede97caa7d49ab53a15f2fd7fc9552))
* **256-02:** add staking position Zod schema and REST API route ([bd7772a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd7772ae85e56f46050bc8e532e45604bd757940))
* **256-03:** add Admin staking tab, admin staking API, and skill docs ([022ba7e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/022ba7e3bc3fb873d90e5e983cdec904e9b19813))


### Bug Fixes

* **176,177,178:** action provider default-enabled + hot-reload, wallet detail amount format, admin actions page ([bd401c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd401c68d8f30ebf969358f4155ce2f857da5afc))
* **179,180:** add CoinGecko API key to Oracle section, remove duplicate API Keys from System page ([099ab63](https://github.com/minhoyoo-iotrust/WAIaaS/commit/099ab63ce32e0884c1cb0e6d3710fbe1ed0a442c))
* **254:** use rpc.evm_default_network + deriveEnvironment() for Lido env switching ([99e1a95](https://github.com/minhoyoo-iotrust/WAIaaS/commit/99e1a95f1370f0195bee40bc2dcf40dfd3b46b1d))
* **255:** revise plans based on checker feedback ([359bed0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/359bed0c1b38570b6cc28b1aa90178829386f954))
* **256:** add policy category to SETTING_CATEGORIES + update test counts ([de0dc93](https://github.com/minhoyoo-iotrust/WAIaaS/commit/de0dc93d6d24f872bb1c6339bbfb6bf20cbb4c43))
* **256:** revise plan based on checker feedback — notification enum, dynamic event tests, settings cross-ref ([6e0313e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6e0313e8efb935ba69e63cab82be638886aecc2e))
* **256:** revise plans based on checker feedback ([0544c6d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0544c6d318508e5a09caffb4e7c6fcd1708aeebd))
* **257-01:** add post-pipeline bridge_status enrollment and metadata persistence ([8cfaa0b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8cfaa0bb11f3b5acfc32475fb1ae264739bc5b31))
* **admin:** resolve dirty-guard isDirty crash on navigation ([#181](https://github.com/minhoyoo-iotrust/WAIaaS/issues/181)) ([2a3152c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2a3152ce031e4aa50b88e1ede0c71981ce26901f))
* **admin:** update system and actions page tests for v28.4 changes ([42bd6fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42bd6fb6b6d5d2df510690c912907841f4ed3214))
* **core:** update NotificationEventType count to 38 in enum test ([7949426](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7949426adbe0e34c0ba22c8f1f5bd7762af59d45))
* **daemon:** update NotificationEventType count to 38 in notification-channels test ([8ef56bc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ef56bc3940668564dc57e5738657b34fa9d3a54))
* resolve issues [#173](https://github.com/minhoyoo-iotrust/WAIaaS/issues/173) [#174](https://github.com/minhoyoo-iotrust/WAIaaS/issues/174) [#175](https://github.com/minhoyoo-iotrust/WAIaaS/issues/175) — policy defaults, connect-info, EVM backoff ([4d5f45b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d5f45bb0e88849536d485b72b7b3f44eeca15cb))
* update NotificationEventType expected count to 38 in enum SSoT verifier ([974683e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/974683e500714ee6989a8a864785f9877c2f29fc))

## [2.6.0-rc.12](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.11...v2.6.0-rc.12) (2026-02-24)


### Bug Fixes

* skip native ETH polling on L2 chains to avoid getBlock timeout ([12e35f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12e35f5203d562a169f0334ad99a464f61541ac3))
* skip native ETH polling on L2 chains to avoid getBlock timeout ([2383c1a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2383c1aec78e477a95eacdaae5982deadb24e0e1)), closes [#172](https://github.com/minhoyoo-iotrust/WAIaaS/issues/172)

## [2.6.0-rc.11](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.10...v2.6.0-rc.11) (2026-02-24)


### Bug Fixes

* only trigger logout on 401 from admin endpoints in apiCall ([3b7f438](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3b7f43871abe677e995e5e497a602ff76055130b))
* only trigger logout on 401 from admin endpoints in apiCall ([7df8a1e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7df8a1ec4c32c92ccb095bb487282f8533fbd6b4)), closes [#171](https://github.com/minhoyoo-iotrust/WAIaaS/issues/171)

## [2.6.0-rc.10](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.9...v2.6.0-rc.10) (2026-02-24)


### Bug Fixes

* resolve issues [#168](https://github.com/minhoyoo-iotrust/WAIaaS/issues/168) formattedAmount, [#169](https://github.com/minhoyoo-iotrust/WAIaaS/issues/169) EVM backoff, [#170](https://github.com/minhoyoo-iotrust/WAIaaS/issues/170) dual-auth ([0f01bbf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0f01bbf5a6ab86497192c7d346a03099b7ed12f1))
* resolve issues [#168](https://github.com/minhoyoo-iotrust/WAIaaS/issues/168) formattedAmount, [#169](https://github.com/minhoyoo-iotrust/WAIaaS/issues/169) EVM backoff, [#170](https://github.com/minhoyoo-iotrust/WAIaaS/issues/170) dual-auth ([d9b723d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d9b723dd632d727c6b37ae721f833100a3d9a900))
* use fake timers in EVM polling worker test to handle stagger delay ([b6be07f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b6be07ff63e7800fac38c17975f324e58edf5257))

## [2.6.0-rc.9](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.8...v2.6.0-rc.9) (2026-02-23)


### Features

* **251-01:** add IAsyncStatusTracker interface, GAS_WAITING enum, DB v23 migration ([7e59708](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7e59708b324e7ddb06781cc62a5d77309a69c8d0))
* **251-02:** add AsyncPollingService with BackgroundWorkers integration ([5a51b25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5a51b25afea73f7bb26c5e15ef0748c06c9b0190))
* **252-01:** add LiFiApiClient, Zod schemas, config, daemon settings ([4071bec](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4071becd9e84cb296ba03dda776c17f4d8319b99))
* **252-02:** add LiFiActionProvider with cross_swap and bridge actions ([b40d079](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b40d079a3e9692c3e48f91502d74a627f2a02ada))
* **252-03:** add BridgeStatusTracker, notifications, and reservation release ([5803855](https://github.com/minhoyoo-iotrust/WAIaaS/commit/58038552831a5df6cf7e65cfdc924c6100419ba5))
* **253-01:** add LI.FI cross-chain bridge documentation to actions.skill.md ([48a1771](https://github.com/minhoyoo-iotrust/WAIaaS/commit/48a1771898e75775fbe1922c58e2775aa99342d7))
* LI.FI cross-chain bridge integration (Phases 251-253) ([bb3e676](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bb3e6764aa383db0a0df5a38adf23c53196feba0))


### Bug Fixes

* **253-01:** remove unused consoleSpy variable in LiFi MCP test ([0f7162d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0f7162dee1664955025dc3443d9e1b731160127c))
* correct UNSUPPORTED_CHAIN error code to INVALID_INSTRUCTION in skill file ([d0526c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0526c3f716fee245f32555a45109777f4b75d19))
* extract rpcConfigKey helper to prevent RPC key duplication ([#167](https://github.com/minhoyoo-iotrust/WAIaaS/issues/167)) ([81879a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81879a01d57c6fc84daf5384d4b01e352ef6783b))
* remove redundant chain prefix from EVM RPC setting key in subscriberFactory ([#167](https://github.com/minhoyoo-iotrust/WAIaaS/issues/167)) ([406ee03](https://github.com/minhoyoo-iotrust/WAIaaS/commit/406ee03634c01f2a22cdcc2bdb9da43f572262f6))
* update enum SSoT expected counts for LI.FI bridge additions ([4327048](https://github.com/minhoyoo-iotrust/WAIaaS/commit/432704861cd57c3a1a172dfe6c42c220c73162ac))
* update stale test fixtures for DB v23, LiFi settings, and bridge events ([f7b59b0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f7b59b0ef1a89e52db975c5716fdba7eeab79e99))
* update test fixtures for DB v23 migration and LiFi config keys ([af7cd7c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/af7cd7c06d507d3fcc770ecc1b164b4623e00e12))

## [2.6.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.7...v2.6.0-rc.8) (2026-02-23)


### Features

* **248-01:** add actions settings category and ACTION_API_KEY_REQUIRED notification ([0ffc2a0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0ffc2a0a2f4135c3464bf145262d0ce8766f7ed2))
* **248-01:** migrate registerBuiltInProviders to SettingsService and fire API key notification ([de183fd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/de183fdef9836421c0ec022da4072c313350ff62))
* **248-02:** extend resolve() to return ContractCallRequest[] with actionProvider tagging ([df35876](https://github.com/minhoyoo-iotrust/WAIaaS/commit/df358764ed91e16a00e50c3cf8d35ffea22ae54d))
* **248-02:** sequential pipeline execution + provider-trust CONTRACT_WHITELIST bypass ([f61f958](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f61f958c820afcaa4b84abbd1c456a1d6c98e2ff))
* **248-03:** add Actions page with provider list, toggles, and API key management ([dcfc904](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dcfc904f539e09ef05c523c4f54cadaf9d5d25b4))
* **249-01:** add ZeroExApiClient, Zod schemas, and config ([7690aea](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7690aeaa21510fda7b141bfb0c26cb80d7800077))
* **249-02:** implement ZeroExSwapActionProvider with approve+swap resolution ([b3dd141](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3dd141dcdbabf22c54163dff173bc1ccd63b64d))
* **250-01:** add execute_action method to Python SDK ([b21c91e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b21c91eb632ffbba766b32d81c18ef0d4199d901))
* **250-01:** add executeAction method to TS SDK ([6c93cbf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c93cbf3a3d4c5e4376f89be006dca539409e806))


### Bug Fixes

* **248:** update test assertions for executeResolve array return and notification count ([ef72b5d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ef72b5dd5b0112326dd6e91746bacbad54aad2b1))
* **250:** update Python SDK examples in skill docs and fix INTG-03 tool name ([8663782](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8663782b621226abd79590b9d015e8778d091795))
* align test assertions with formatted amounts and multi-network subscriptions ([fe337aa](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe337aaa1ee514fb05276e3f601861116dcc3544))
* align test fixtures with column rename and add multi-network subscriptions ([da29107](https://github.com/minhoyoo-iotrust/WAIaaS/commit/da29107edd2dbff1a5949ef41c0ed22c2e355ffb))
* correct provider name in Python SDK docstring (0x-swap -&gt; zerox_swap) ([31252fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/31252fb0f848a12e00ee24d8f3db801422a2ab35))
* create WcSigningBridge during WalletConnect hot-reload ([#166](https://github.com/minhoyoo-iotrust/WAIaaS/issues/166)) ([3231742](https://github.com/minhoyoo-iotrust/WAIaaS/commit/32317429e7c5b2154bdf94116579e04376f39770))
* resolve 7 open issues ([#157](https://github.com/minhoyoo-iotrust/WAIaaS/issues/157)-[#163](https://github.com/minhoyoo-iotrust/WAIaaS/issues/163)) for milestone v28.2 ([e31d9dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e31d9dc37050e3fd266726679f36be32b664d0b9))
* update action-provider contract test for resolve() array return type ([b8b153c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b8b153cb8ed94b0216ef056c137dffbf8ed9e68c))
* update NotificationEventType expected count to 31 ([ac0b986](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ac0b9865422264e2ff5a0ece7ad5028a78d14c3e))

## [2.6.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.6...v2.6.0-rc.7) (2026-02-23)


### Bug Fixes

* add @waiaas/actions to release-please config and bump version ([5dedec4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5dedec4a4bd296a63c32d23f547538e00a97c267))

## [2.6.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.5...v2.6.0-rc.6) (2026-02-23)


### Bug Fixes

* **ci:** add @waiaas/actions package to Docker build and release pipeline ([35c59ab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/35c59ab03f82f66ed6821a1ade3056eb8e33ae13))

## [2.6.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.4...v2.6.0-rc.5) (2026-02-23)


### Features

* **actions:** add Jupiter Swap action provider package ([43e710a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/43e710a5931201f6fb98686274c2aaa54cdcf98d))
* add per-event notification filtering with collapsible UI ([#155](https://github.com/minhoyoo-iotrust/WAIaaS/issues/155)) ([3818174](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3818174874f70ecb1ed831a5dfb9c0ea77b9fe82))
* **admin:** merge Transactions and Incoming TX pages ([#153](https://github.com/minhoyoo-iotrust/WAIaaS/issues/153)) ([d71461a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d71461a9ac069c351f1008204120741efc1abc0f))
* **daemon:** integrate Jupiter Swap provider with config and auto-registration ([c87127e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c87127e48cd745738d4e77581693e3f78ee9b69c))


### Bug Fixes

* **admin:** add FilterBar and SearchInput CSS styles ([#156](https://github.com/minhoyoo-iotrust/WAIaaS/issues/156)) ([a852089](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a852089636df62de8109f8ba15143e0fac75ed4c))
* move Balance Monitoring tab from Wallets to Notifications page ([#154](https://github.com/minhoyoo-iotrust/WAIaaS/issues/154)) ([3662377](https://github.com/minhoyoo-iotrust/WAIaaS/commit/36623774d1db0e4b007687cc5eea6f6ddfd3c3f8))

## [2.6.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.3...v2.6.0-rc.4) (2026-02-23)


### Features

* **244-01:** finalize DEFI-01 package structure design (PKGS-01~04) ([6799b89](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6799b8983a70d0ba2738642e8c522d47ce3999c5))
* **244-01:** update m28-02 objective from Permit2 to AllowanceHolder ([2837cdf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2837cdfbbc6158b853c80309d73d0500115dd9f9))
* **245-01:** ASNC-01/02/04/05 async status tracking confirmed design ([82eab8d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/82eab8dde16ca167ccd4b5afed930b5657e0534d))
* **245-01:** ASNC-03 integrated DB migration v23 design confirmed ([6af6ac0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6af6ac0dd0e0cdd3bf885fd6085bc074b7b677df))
* **245-02:** add SAFE-01 Jito MEV fail-closed and SAFE-02 wstETH adoption design ([8600a98](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8600a98ed666185e43151938da38897309845ec4))
* **245-02:** add SAFE-03 stale calldata re-resolve and SAFE-04 API drift defense design ([90d42f3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/90d42f3011e69cf005b5900bf3eb93d91bb99d1f))

## [2.6.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.2...v2.6.0-rc.3) (2026-02-23)


### Features

* **239-01:** add ExplorerLink, FilterBar, and SearchInput shared components ([f147357](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f1473570bed7b76c78829a649e0a1d87b28968b4))
* **239-02:** add cross-wallet admin API endpoints ([7a23ba9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7a23ba9145dc78f7af029463901f6b8066ca7292))
* **240-01:** add Transactions page with table, filters, search, pagination, and row expand ([98bc517](https://github.com/minhoyoo-iotrust/WAIaaS/commit/98bc517fb2cf8ee87e6bf01c0b01f8c00e461ded))
* **240-02:** add approval card, clickable cards, and network/txHash columns to dashboard ([6d7392f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6d7392fc0da6b0074c1de10a85300de0b203d17f))
* **241-01:** create Token Registry admin page with network filter and CRUD ([37ee933](https://github.com/minhoyoo-iotrust/WAIaaS/commit/37ee9338574ab5ea76e1604b8ba4e4573fd2f7d7))
* **241-02:** add notification log filters and clickable wallet links ([4bc2217](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4bc2217dc90f3619a89f9a5147cff91c4022fae3))
* **241-gap:** add token metadata auto-resolve endpoint and admin UI auto-fetch ([8113d64](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8113d64a1a786c4438d0af01a832329336da5b8f))
* **242-01:** add /incoming page with settings panel, TX table, filters, wallet toggle ([df4f1eb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/df4f1eb0e7260e3521153b3dfd811f0527f3b301))
* **243-01:** add search, filter, and balance column to wallet list ([fb53ea5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fb53ea5c685a3a90b9535a88782a0bf41d7ee582))
* **243-02:** restructure wallet detail into 4-tab layout with enhanced transactions and USD balance ([a643c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a643c99197ea5a047dbcc60d5d5239fe16f201a4))


### Bug Fixes

* **admin:** add USD value to wallet list balance column and fix Badge style prop ([007744a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/007744a94f5f39c25907362b11d35ff59093aa3b))
* **admin:** close milestone audit gaps DASH-04 and TXN-03 ([873d6f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/873d6f609cbbc3a9e9a2b8c918f9f673b95e81ea))
* **admin:** update tests for 4-tab wallet detail layout and dashboard polling ([7fdd8d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7fdd8d4708710ab7ef6d4a457b47b4aac1640120))
* resolve open issues [#150](https://github.com/minhoyoo-iotrust/WAIaaS/issues/150)-[#152](https://github.com/minhoyoo-iotrust/WAIaaS/issues/152) and fix AdminStatus amountUsd type ([c19cf98](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c19cf98d14230ed2502b2257f7f80cb04af8628f))

## [2.6.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc.1...v2.6.0-rc.2) (2026-02-22)


### Features

* **235-01:** implement TokenLimitSchema with superRefine validation for SPENDING_LIMIT ([c2bc8a9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c2bc8a9db3ce6066fe6e9aeded8d522615744cea))
* **235-01:** unblock USD-only and token_limits-only policy creation at daemon level ([d57b4f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d57b4f5126db1f65a6231ce41582dfcf53b58938))
* **236-01:** add tokenDecimals to TransactionParam + wire through buildTransactionParam ([062ca6a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/062ca6a3233bdc150cbec482418aa7bd42fd25ff))
* **236-02:** implement evaluateTokenTier + token_limits evaluation in policy engine ([2736239](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2736239b648bb98f6c095938a71395c96c601b9a))
* **236-03:** wire tokenContext through all evaluateSpendingLimit callsites ([4f78886](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f7888618b785b3f8487f8aa503ecf771e5643e4))
* **237-01:** extend PolicyFormProps with network and update validateRules ([dbf8aa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dbf8aa3970b19c565f083495513dc33d25009d9d))
* **237-01:** restructure SpendingLimitForm with USD top, token limits, and deprecated raw tiers ([42bcde8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42bcde879e5b6ffd75c3fbba04ab040df1d28d01))
* **237-02:** add CAIP-19 token limit rows with registry integration ([b7c279b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b7c279b1c13f4c9883e7f440be751b88acc6c4c2))
* **237-02:** add token_limits ordering validation and deprecated warning ([b230e93](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b230e93ce700ece1bcd392c4eb7fdda29f5b5ee8))


### Bug Fixes

* **235:** revise plans based on checker feedback ([d47234c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d47234c12e9171de0687824bb32039148ce44640))
* **admin:** add USD defaults to SPENDING_LIMIT and update tests ([893b7f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/893b7f40cfb4cda3fd631c90fb9402c435f61f68))
* **daemon:** update APPROVE tier tests for Phase 236 behavior change ([60aa3da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/60aa3dad97b7581595eb7e3cb7523a9ea4aea29e))

## [2.6.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.6.0-rc...v2.6.0-rc.1) (2026-02-22)


### Features

* **231-01:** implement CAIP-2/19 parser, formatter, and Zod schemas ([81a3691](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81a36915b7fb0ddf4ebfb78282b9840cc4d8a145))
* **231-02:** implement network-map.ts and asset-helpers.ts with 13-network CAIP-2 mapping ([4a42d4a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4a42d4a3f15d41b22780ad1dfc7f97fa8ed27a68))
* **231-02:** integrate CAIP module with x402, WC, TokenRef, barrel exports ([41c63d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/41c63d7033b4d45c894dff6920f0d8a826e1414b))
* **232-01:** migrate all oracle callers to buildCacheKey(network, address) ([2ab5d6c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2ab5d6c3bf0e3f1688e29df63c0f0ef987d18c28))
* **232-01:** rewrite buildCacheKey to CAIP-19 + expand CoinGecko L2 + update Pyth keys ([4d4a209](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4d4a2094aa135d1fc4bf3d0d1e0a00b8bfd2fdbb))
* **232-02:** thread network through pipeline oracle callers ([ef4add5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ef4add5dc479f277d88c94d25fc966827f23d53a))
* **233-01:** add assetId field to token registry service and API response ([2d2be3f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2d2be3f08e414fadaebbb163c8959c410b1b13d1))
* **233-01:** add DB v22 migration with asset_id column and CAIP-19 backfill ([601ed90](https://github.com/minhoyoo-iotrust/WAIaaS/commit/601ed9097edab36037641a3bde04b6140d8f05fa))
* **233-02:** add optional assetId to TokenInfoSchema with cross-validation ([7ce2289](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7ce228943afd5abb623f543da8dd0f2b5843d0a2))
* **233-02:** propagate assetId through TransactionParam in pipeline ([bab6742](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bab6742499a3ae2f19d6f9bf929e8fc669ec6ed3))
* **233-03:** extend AllowedTokensRulesSchema with optional CAIP-19 assetId ([6231d68](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6231d6845ea302b2e75d8cb80dd545e5630834a0))
* **233-03:** implement 4-scenario ALLOWED_TOKENS matching matrix with CAIP-19 ([7942d09](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7942d09febc8dc20969756509393161b59deed81))
* **234-01:** add CAIP-19 assetId parameter to MCP token tool schemas ([ea5f37a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ea5f37a29215a1f6f0cb9a220eaaff8b7e106dfd))
* **234-02:** add optional CAIP-19 assetId to TS and Python SDK types ([0c44c99](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0c44c99e771b8de1a5e9ebbae128ef1bd4db2d76))


### Bug Fixes

* **231:** revise plans based on checker feedback ([5022668](https://github.com/minhoyoo-iotrust/WAIaaS/commit/502266859dae04a77fa3712330e892797232e47b))
* **233:** revise plans based on checker feedback ([fd7f1d8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd7f1d88cb50cfcfd4ee0d15f101b496b28aa349))
* lower daemon coverage thresholds to 84% for lines/statements ([871a4bc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/871a4bc93c9d956125fb967cdc6a9f583453d51e))
* resolve 5 open issues ([#143](https://github.com/minhoyoo-iotrust/WAIaaS/issues/143), [#146](https://github.com/minhoyoo-iotrust/WAIaaS/issues/146), [#148](https://github.com/minhoyoo-iotrust/WAIaaS/issues/148), [#149](https://github.com/minhoyoo-iotrust/WAIaaS/issues/149), [#144](https://github.com/minhoyoo-iotrust/WAIaaS/issues/144)) ([c911235](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c911235e36f3cabc3c9d481bf5a277dd6d27591e))
* update test files to use CAIP-19 cache keys and NETWORK_TO_CAIP2 ([a404eeb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a404eeb55072ebef8c6ffd33af2681c39c5da801))

## [2.6.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.5.0...v2.6.0-rc) (2026-02-22)


### Features

* **224-01:** add IChainSubscriber interface and IncomingTxStatus enum ([bd76428](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bd764289bbc5325fe02f2470abe54f297b6e325c))
* **224-01:** add IncomingTransaction Zod schema and event types ([c40b0ba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c40b0baa5c7cf23a0a7bf9b5cd94c1e2ef0008d9))
* **224-02:** add DB v21 migration + pushSchema DDL for incoming TX monitoring ([35de861](https://github.com/minhoyoo-iotrust/WAIaaS/commit/35de8613072f84675ccc38115c82623f5181e255))
* **224-02:** add Drizzle schema tables + update migration chain tests + re-exports ([f671e62](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f671e625c393f607b2adb835392730dcc63d9f36))
* **225-01:** add SOL and SPL/Token-2022 incoming transfer parsers ([953323f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/953323f0e62cde859199c9e6ad37ddf32dba8b22))
* **225-01:** add SolanaIncomingSubscriber, SolanaHeartbeat, and 19 tests ([4eb612d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4eb612d77b0d6b9fb096a7d4daeb4643705f4896))
* **225-02:** implement EvmIncomingSubscriber with ERC-20 and native ETH detection ([b508994](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b508994fe085e5c9883f390531d5da388d6a09cc))
* **225-03:** add ConnectionState type, calculateDelay, and reconnectLoop ([7710287](https://github.com/minhoyoo-iotrust/WAIaaS/commit/77102875e32105e6a46fa31ecc3c9461ae373fae))
* **226-01:** implement IncomingTxQueue with Map dedup and batch flush ([f7fda7d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f7fda7d1934be15b5f5d3674c2012bedbb2657c2))
* **226-02:** implement SubscriptionMultiplexer with connection sharing and reconnection ([d060c41](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d060c41c5f0b34c22e0d4202575a47c1bc4326b1))
* **226-03:** add worker handler factories and cursor utilities ([710df0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/710df0d26c209698aeba2b67fbe51928113f4507))
* **226-04:** add safety rules + IncomingTxMonitorService orchestrator ([2223283](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2223283b330730cb872d6f9f5dfaa36e6999c87d))
* **226-04:** integrate IncomingTxMonitorService into DaemonLifecycle ([c4ce706](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c4ce706ec4ee288cdfdfd9c159df2c7f9171487b))
* **227-01:** add [incoming] section to DaemonConfigSchema and KNOWN_SECTIONS ([de13998](https://github.com/minhoyoo-iotrust/WAIaaS/commit/de1399868589bf5a9a5c6a24e24ccaeebde821c1))
* **227-02:** add IncomingSettings component to Admin UI settings page ([b17fc3a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b17fc3a6e0f3ce1184b9dbeae8cb3cb6b1fc2da0))
* **227-02:** add TX_INCOMING and TX_INCOMING_SUSPICIOUS notification event types ([af557ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/af557aced0136ae5bdec3881692164151a453fef))
* **228-01:** add incoming transaction list/summary routes and OpenAPI schemas ([7a5026a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7a5026abb7c2c0c950125bb4bafb2616ef05a633))
* **228-01:** add PATCH /wallets/:id route and mount incoming routes in server ([fe71253](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe71253a6902e0b07ce3b05c4ba92272cb7874ae))
* **228-02:** add incoming transaction models and methods to Python SDK ([fc99f6f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fc99f6f9acba47b05f1300227b49c6fc2825ddea))
* **228-02:** add incoming transaction types and methods to TypeScript SDK ([7c42f61](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7c42f61617dcd645dff21588173f2f1ef6195baf))
* **228-03:** add MCP tools for incoming transaction queries ([ea6bc59](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ea6bc59805ed7ebb0495bb9b6bae50ce57264c69))
* **228-03:** update wallet.skill.md with incoming transactions section ([2f4e56c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2f4e56c5a1fb3e10d122540498151277a6b6a365))
* add policy.default_deny_x402_domains runtime toggle ([#131](https://github.com/minhoyoo-iotrust/WAIaaS/issues/131)) ([5bc84e8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5bc84e8115d6b8192e9f9bb26a815d9e1b112c08))
* add wallet suspend/resume REST API and Admin UI ([#133](https://github.com/minhoyoo-iotrust/WAIaaS/issues/133)) ([373111a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/373111a9dd2ee9e95d19a15f49657c562ecb58e4))
* display walletName instead of walletId in notifications ([#135](https://github.com/minhoyoo-iotrust/WAIaaS/issues/135)) ([e0c26c1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0c26c165052279c881164a64c9e790022ed9c35))


### Bug Fixes

* **225-02:** fix TypeScript strict mode errors in subscriber tests ([a8ae1c9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a8ae1c9c405ad58376214abd06d1a02d5aaeac0a))
* **226:** add non-null assertions for strict TS build in test files ([d666a59](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d666a5926ab5ecde990cd3f949a8f3a5ea27a83e))
* **226:** revise plans based on checker feedback ([782736c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/782736c36053b6b74488b9760af4c805f5509958))
* **228:** revise plans based on checker feedback ([025bbbf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/025bbbf9a018a1fc4073c5634a0c504e402481a7))
* **229:** fix unused import and type assertion in integration tests ([463628d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/463628dbb6c149a311c10468508039da6d05715e))
* **229:** revise plan 229-02 based on checker feedback ([d10c125](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d10c125342d9a9016ae6dd9a4267523451befcf1))
* **230-01:** wire BackgroundWorkers, polling workers, and gap recovery across daemon lifecycle ([6132409](https://github.com/minhoyoo-iotrust/WAIaaS/commit/61324096db3fae6abb521cc34ee253fff77514d7))
* kill switch recover — remove dual-auth, fix error-handler catch-all code ([#132](https://github.com/minhoyoo-iotrust/WAIaaS/issues/132), [#134](https://github.com/minhoyoo-iotrust/WAIaaS/issues/134)) ([c27f838](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c27f8382ff4c31bf82eeb92fcc30c530e857ddca))
* **mcp:** update server test tool count from 21 to 23 ([5b76a3e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5b76a3e3fc9373d8ab007ba6a6c148c8c6269c1a))
* notification title duplication and empty wallet field ([#137](https://github.com/minhoyoo-iotrust/WAIaaS/issues/137), [#138](https://github.com/minhoyoo-iotrust/WAIaaS/issues/138)) ([8e4e83d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8e4e83dda08307cef396cbb2a45cac063b29d5f8))
* replace sync-version with sync-skills for root-to-package skill copy ([#136](https://github.com/minhoyoo-iotrust/WAIaaS/issues/136)) ([bfcec98](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bfcec98d22c0d6a74b04182cfcd69802ad82c5d8))
* resolve 4 open issues ([#139](https://github.com/minhoyoo-iotrust/WAIaaS/issues/139), [#140](https://github.com/minhoyoo-iotrust/WAIaaS/issues/140), [#141](https://github.com/minhoyoo-iotrust/WAIaaS/issues/141), [#142](https://github.com/minhoyoo-iotrust/WAIaaS/issues/142)) for v27.1 milestone ([3684a5b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3684a5bf77b60dff5448900516c3a258b1b78de4))
* resolve lint errors in solana subscriber and test files ([e9a4cfb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e9a4cfb84c9a08bcaed49e7bcac97d984a95c1cd))
* update NotificationEventType expectedCount from 28 to 30 in enum SSoT ([b4224cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b4224ccc19bef604a556a610a17f0b11d2d39af9))

## [2.5.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.5.0-rc.1...v2.5.0) (2026-02-21)


### Bug Fixes

* promote v2.5.0-rc.1 to stable 2.5.0 ([bb1f523](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bb1f52310eeecd3b1f89acabe603f58f4464569f))

## [2.5.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.5.0-rc...v2.5.0-rc.1) (2026-02-21)


### Features

* add agent read-only access to policies and tokens APIs ([724f4df](https://github.com/minhoyoo-iotrust/WAIaaS/commit/724f4df3c422fb9c0a36ef064196a27bfbfa6036)), closes [#128](https://github.com/minhoyoo-iotrust/WAIaaS/issues/128)
* remove bulk session/MCP token creation (superseded by 1:N model) ([c3dffe2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3dffe25e3ee78eae61eec4f0ddaca0a86392f77)), closes [#130](https://github.com/minhoyoo-iotrust/WAIaaS/issues/130)


### Bug Fixes

* accept numberless RC tags in promote and release workflows ([a81c0d4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a81c0d46d640396786b8167818643c01f1b3afa7)), closes [#127](https://github.com/minhoyoo-iotrust/WAIaaS/issues/127)
* load notification channels from SettingsService on daemon startup ([028696a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/028696a13f25a381a27e5ba8d8dd23cd046b7c83)), closes [#129](https://github.com/minhoyoo-iotrust/WAIaaS/issues/129)

## [2.5.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0...v2.5.0-rc) (2026-02-21)


### Features

* add session token reissue API and token issued count tracking ([#125](https://github.com/minhoyoo-iotrust/WAIaaS/issues/125)) ([0c4bc07](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0c4bc07fe8bb0156197934b596c3c16a5499a2bf))
* reuse existing session in agent-prompt generation ([#124](https://github.com/minhoyoo-iotrust/WAIaaS/issues/124)) ([b7ea2d3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b7ea2d31c317fbe3c03369810a68bdf10bf70eaf))


### Bug Fixes

* add session token setup instructions to Claude Code guide ([#122](https://github.com/minhoyoo-iotrust/WAIaaS/issues/122)) ([ae64a71](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ae64a71dda8d8cb8e109da6ef47e999c61f1ef95))
* include wallet UUID and available networks in agent prompt ([#123](https://github.com/minhoyoo-iotrust/WAIaaS/issues/123)) ([357659f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/357659ff2323ccfcd3f21b5671447a5bd25b8305))
* resolve detached HEAD in release.yml prerelease restore step ([#126](https://github.com/minhoyoo-iotrust/WAIaaS/issues/126)) ([29e6e03](https://github.com/minhoyoo-iotrust/WAIaaS/commit/29e6e0313a7d1576bacb9da215cf25fdc6502534))
* update schema version assertions from 19 to 20 in remaining test files ([e588fe6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e588fe671df9eacbfb6b97b55742f801757f3811))

## [2.4.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.9...v2.4.0) (2026-02-21)


### Bug Fixes

* promote v2.4.0-rc.9 to stable 2.4.0 ([ab7aa13](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ab7aa138fb8b6e1ed5fc7c83a812684ee0e9f617))

## [2.4.0-rc.9](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.8...v2.4.0-rc.9) (2026-02-21)


### Features

* **210-01:** add 4 session error codes + extend CreateSessionRequestSchema ([a678870](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a67887092861cd2df89fb0dbbc525c40568f19f5))
* **210-01:** add DB v19 migration for session_wallets junction table ([cffc76a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cffc76ae54250be8f5fbe351ca13416bccb685b5))
* **210-02:** session-auth dual context + multi-wallet session creation + OpenAPI schemas ([3891ad6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3891ad6e348613f569533365541126d5f384a226))
* **210-03:** add cascade defense logic to TERMINATE handler ([9608028](https://github.com/minhoyoo-iotrust/WAIaaS/commit/96080288ded56999f6d175c2bb62e644b9217c2d))
* **211-01:** add resolveWalletId helper and remove walletId from session-auth ([4b1e6c5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4b1e6c5d19c4b79beae6d7e959dc50b80c675684))
* **211-02:** replace c.get('walletId') with resolveWalletId() across all endpoints ([5c52176](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5c52176787701fccd6d8935f77e4fccc277b0ce0))
* **212-01:** add ConnectInfoResponseSchema and GET /v1/connect-info route handler ([9c3bfb9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9c3bfb9e7db962bb83e8c2a8d5286352df393644))
* **212-01:** integrate connect-info route with sessionAuth middleware ([771b9d9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/771b9d9d4528498ccad81d4ae8c9d453d5ea716b))
* **212-02:** refactor agent-prompt to single multi-wallet session + shared prompt builder ([e039fcb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e039fcb2978a1d341fde4198c646ed4c00c80d5a))
* **213-01:** add createSession and getConnectInfo to TypeScript SDK ([b8bf1fe](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b8bf1fef6f43e99d3922f5f90ba068818d7d2273))
* **213-01:** add get_connect_info to Python SDK with ConnectInfo model ([c894fc4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c894fc4c0abad05ead680e89a4f94a812b4a220d))
* **213-02:** add connect_info MCP tool and wallet_id param to all tools ([0b75dda](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0b75dda8b64f8d98c48c36562651c425257d02ee))
* **213-02:** MCP single-instance model with optional WAIAAS_WALLET_ID ([e575f2e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e575f2e713835340aeb69185a463b21dffa7f745))
* **213-03:** admin UI multi-wallet session creation + wallet list display ([9023796](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9023796867f0618a68fb42eae2dfce9359263351))
* **213-03:** CLI quickset single multi-wallet session + single MCP config ([fce42f5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fce42f51784f9a477b760bae0fcd20ff2fcd5142))
* **213-04:** add SESSION_WALLET_ADDED/SESSION_WALLET_REMOVED notification events ([b0f993c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0f993cf0a0e8ec75288699e8b77bcea28857145))
* automate RC-to-stable promotion via workflow_dispatch ([#120](https://github.com/minhoyoo-iotrust/WAIaaS/issues/120)) ([d07ca6a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d07ca6a0bba74a2d9b56ca88c81eb6325637dc75))


### Bug Fixes

* **210:** revise 210-02 plan based on checker feedback ([103df89](https://github.com/minhoyoo-iotrust/WAIaaS/commit/103df89481f80d10a0ef831137af93481895af1e))
* **214-03:** align Python SDK ConnectInfo type with daemon schema ([cdd064b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cdd064b9b14c5329a26fe9d541fa7fcf9f0fa452))
* **214-03:** align SDK ConnectInfoResponse type with daemon schema ([7ab8828](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7ab8828cefe1533fd5866e18d83c93fba767bb40))
* auto-restore prerelease mode after stable deploy ([#121](https://github.com/minhoyoo-iotrust/WAIaaS/issues/121)) ([03ed654](https://github.com/minhoyoo-iotrust/WAIaaS/commit/03ed654092e4087b5bc6525caf91b208123340f8))
* migrate session tests and code to v19 session_wallets junction table ([79c7b25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/79c7b25e11b9b973fd0c6bd85f7e6a14daf1da6e))
* update error code count in tests from 100 to 104 ([2073d94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2073d94e8c632e478be81121b5dab108fc6496c7))
* update NotificationEventType count from 26 to 28 in enum SSoT ([d4e38c7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4e38c7c416c70711599e5967890be2c26fb3670))

## [2.4.0-rc.8](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.7...v2.4.0-rc.8) (2026-02-20)


### Bug Fixes

* **ci:** skip already-published npm versions on deploy re-run ([5661295](https://github.com/minhoyoo-iotrust/WAIaaS/commit/56612959ce156eb6a5977f76291d38717097b886))

## [2.4.0-rc.7](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.6...v2.4.0-rc.7) (2026-02-20)


### Bug Fixes

* separate push-relay CLI entry point from library exports ([81465f2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/81465f23fcc9d8444b12e5ddf670177ce4e733b4))

## [2.4.0-rc.6](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.5...v2.4.0-rc.6) (2026-02-20)


### Features

* **207-01:** change NtfySigningChannel to base64url encode SignRequest ([01795f7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/01795f7865f6ac38a431aabba97e9ff5b3978056))
* **208:** add @waiaas/push-relay package ([8145f29](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8145f29c24091e56a184459578ea0c134c658d86))
* **209:** add push-relay deployment infrastructure ([f7b1ca9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f7b1ca94d111b1f3257b9f74ef8a906b60ed13d9))


### Bug Fixes

* add non-null assertion in wallet-sdk channel test ([6057091](https://github.com/minhoyoo-iotrust/WAIaaS/commit/60570914f816f70a33f0befaa90c445882eeb4ec))
* correct policy defaults checkbox category key mismatch ([#117](https://github.com/minhoyoo-iotrust/WAIaaS/issues/117)) ([4900cf4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4900cf4c454d48552deb35d5dd28b6d89b381e01))
* **push-relay:** add missing category field in fcm-provider test fixture ([19ef866](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19ef866b84e2ef4d8271a7b32d6e969094452710))

## [2.4.0-rc.5](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.4...v2.4.0-rc.5) (2026-02-20)


### Bug Fixes

* rename unused sql parameter to _sql in wallet notification test ([a8d2278](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a8d2278f27b49b831acbac02173b8f61e726881a))

## [2.4.0-rc.4](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.3...v2.4.0-rc.4) (2026-02-20)


### Bug Fixes

* **ci:** add wallet-sdk to release publish pipeline ([ca88b98](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca88b98194a8fd76eb3b8b4cb83e546bf2b730ff))

## [2.4.0-rc.3](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.2...v2.4.0-rc.3) (2026-02-20)


### Features

* **202-01:** add DB migration v18, signing SDK settings, and WalletLinkRegistry ([777bf94](https://github.com/minhoyoo-iotrust/WAIaaS/commit/777bf94ee8ea62e945ee1a94c2b5b0c1cc3a8b1a))
* **202-01:** add SIGNING domain error codes, signing protocol Zod schemas, and base64url utilities ([8c7f927](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8c7f927c85d14dc4284444f591c70c38aed3d53e))
* **202-02:** implement SignRequestBuilder for PENDING_APPROVAL transactions ([cd76243](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cd762431d25df50b98103e85078c976cb0916ad4))
* **202-02:** implement SignResponseHandler for signing SDK approve/reject ([a58eb28](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a58eb28fe85ebbde17efdf8a97bc2308defa3d21))
* **202-03:** add sendViaNtfy, sendViaTelegram, subscribeToRequests channel functions ([c69dafb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c69dafb0d03831400fd43959a9242cfdb31300d6))
* **202-03:** scaffold @waiaas/wallet-sdk with parseSignRequest, buildSignResponse, formatDisplayMessage ([228519a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/228519a4d93f0b03ec9f7a554f99ce13b5a02b96))
* **202-04:** add signing-sdk module index and E2E integration tests ([fd995b8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd995b8364f3a7afe9b03c6dbf9d272abb9c43c5))
* **202-04:** implement NtfySigningChannel with SSE subscribe ([8e78c27](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8e78c277d38631ab1880b012e1752f4c2218c21b))
* **203-01:** add /sign_response command to TelegramBotService + unit tests ([58f8915](https://github.com/minhoyoo-iotrust/WAIaaS/commit/58f8915959d758187e8e215a0472a4fa86942c2a))
* **203-01:** implement TelegramSigningChannel with ISigningChannel interface ([120a42c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/120a42c3988e6598e753990b26bbdf5d616c73b0))
* **203-02:** extend SetOwnerRequestSchema with approval_method field ([898908c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/898908c55d0903e4091d288c81cf72f08b9035a2))
* **203-03:** implement ApprovalChannelRouter for signing channel routing ([cf68cf2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cf68cf22bd3563108d0dfdc993d619cbb0422799))
* **203-04:** add approval method radio selection UI with infra warnings ([d29d50f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d29d50ffbdd201002a97064c066cd5507120240d))
* **203-04:** add WalletDetail approvalMethod type + data loading ([332b96a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/332b96a6a598a9cdf71737ca7b3cabbeb082a56a))
* **204-01:** wire ApprovalChannelRouter through pipeline request path ([479dfc2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/479dfc28996b77090c8891a500d1d1460c0d9104))
* **204-01:** wire signing SDK classes into daemon lifecycle ([33b1987](https://github.com/minhoyoo-iotrust/WAIaaS/commit/33b19874d56b0bfb6fdb0140798fd50cb16d4b9f))
* **204-02:** inject signResponseHandler into TelegramBotService via late-binding setter ([69c4976](https://github.com/minhoyoo-iotrust/WAIaaS/commit/69c49764f219ab0876cf366498d7da581c049055))
* **205-01:** expose all 11 setting categories in admin settings API ([6667f56](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6667f563b65343db2a9af18fc0125aa070b30cf6))
* **205-02:** add Signing SDK settings section to Admin Settings page ([cd0c94e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cd0c94e9d7d9ffac562f25f7d87439cef2587d49))
* **cli:** change default environment mode from testnet to mainnet ([2f97679](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2f97679cbb8ca22b57f3f3b7cf85d9b9f5e1d306)), closes [#112](https://github.com/minhoyoo-iotrust/WAIaaS/issues/112)
* **skills:** add platform-specific skill installers and integration guides ([3e3eb01](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3e3eb0156cec835032ac394b475d66485e13455d))


### Bug Fixes

* **202:** revise plans based on checker feedback ([82db3be](https://github.com/minhoyoo-iotrust/WAIaaS/commit/82db3beb310385ec9ce13e8d6124cfc5d84b1be4))
* **203:** revise plans based on checker feedback ([1c08e55](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1c08e55e54cc3234d8cc6ce7315ab616bb2e155c))
* **admin:** use PUT response settings to prevent save-then-revert UI bug ([f5807f1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f5807f114f47f9dace7ae9428364652b6ac16ceb)), closes [#116](https://github.com/minhoyoo-iotrust/WAIaaS/issues/116)
* **ci:** add test:unit script to wallet-sdk for CI coverage report ([b6b3d4a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b6b3d4a4026e15a8779ed0c77c51ba345c8d6b23))
* **ci:** handle hyphenated package names in coverage-gate.sh ([8b83854](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8b838543867560927057b0b445f91d5df66b58b5))
* **daemon:** read notification status from SettingsService instead of static config ([758dbf4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/758dbf4bcfc008a648633437cf000b875b8d4deb)), closes [#115](https://github.com/minhoyoo-iotrust/WAIaaS/issues/115)
* register wallet-sdk in release-please and add 5 missing packages to CI coverage ([88a90d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/88a90d2c57f7225df2ff83f427c486436e908c66)), closes [#107](https://github.com/minhoyoo-iotrust/WAIaaS/issues/107)
* replace remaining 'waiaas upgrade' references with 'waiaas update' ([5f25838](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5f2583845209b535321a8bfe5580b5e4dcfb2389)), closes [#110](https://github.com/minhoyoo-iotrust/WAIaaS/issues/110)
* resolve lint errors in signing SDK test files and channel impl ([df573d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/df573d7ce692da576ddd035c8d4287e2855e776e))

## [2.4.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc.1...v2.4.0-rc.2) (2026-02-20)


### Features

* **admin:** add agent connection prompt card with REST API ([af0999d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/af0999d6f0561e09ef7b34f5555af4b9812e5f55))
* **admin:** add update available banner to dashboard ([14a6415](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14a6415ef5f91c34384f49e8584989b66fea028f))
* **daemon:** add UPDATE_AVAILABLE notification event type ([839149a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/839149a11cdf1ad443122e7465b95cbd003e9c4b)), closes [#105](https://github.com/minhoyoo-iotrust/WAIaaS/issues/105)


### Bug Fixes

* **cli:** rename upgrade command to update with upgrade alias ([d5ed4d3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5ed4d3a3afeea987ca606a994173d946a288c2d)), closes [#102](https://github.com/minhoyoo-iotrust/WAIaaS/issues/102)
* update NotificationEventType count to 26 and clean up archived phases ([45ad6f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/45ad6f4373434dccf22f5320f3baf380fad4b4ae))
* update NotificationEventType expected count in enum SSoT verifier ([ca521ae](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ca521aeae7c85ef84a0e339f416102f6a7147c54))

## [2.4.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.4.0-rc...v2.4.0-rc.1) (2026-02-19)


### Features

* **194-01:** dynamic CLI version from package.json + engines.node ([7466309](https://github.com/minhoyoo-iotrust/WAIaaS/commit/746630965f7b3a9a94ec2fcf8efae7ecb70f6109))
* **194-01:** init password guidance, config template, permission errors ([2abdf87](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2abdf874ae37794df98dd47bdad1d3c77183764f))
* **194-02:** downgrade Step logs to debug + EADDRINUSE error wrapping ([5152bc7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5152bc720bd92916742946b1144b344909e58a5d))
* **194-02:** start command error formatting + port conflict tests ([1b883f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1b883f46deb8c662099f5e761aab8b12592c7316))
* **195-01:** quickstart English output, expiry display, idempotency, availableNetworks ([745f0f4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/745f0f49e06b9b6d9c5f3aeca82cf5adbc395bb4))
* **195-02:** mcp-setup quickstart guidance and expiry warning ([27b7495](https://github.com/minhoyoo-iotrust/WAIaaS/commit/27b7495d51b398e3759add5bbd964424178c36ad))
* **196-01:** extend skill file version sync to cover root skills/ directory ([f08b6f3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f08b6f30bcc35174f6d50c7c216fe2f28cdc914e))
* **197-01:** add .env.example template for Docker users ([a53486a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a53486a1cdc5877cd476ff7ed1acd3d999e3f20d))
* **197-01:** switch docker-compose.yml to GHCR image reference ([f9c3f5d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9c3f5dc4ac09b4bdef4fb50ee99452d37badde0))


### Bug Fixes

* **196-01:** correct SDK code example field names in README ([bfa2862](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bfa28626ef2415973cd49cea3d491ed41925cfd0))
* **197-02:** sync Python SDK version to 1.7.0 and fix default port to 3100 ([506dac9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/506dac9dac0eac77f8fc5a71f1679313f4e0b485))

## [2.4.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.3.0...v2.4.0-rc) (2026-02-19)


### Features

* **191-02:** add walletconnect page tests ([e805787](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e805787378581032873bd8cbf34cae1355df2293))
* **192-01:** add system page tests ([c169d86](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c169d86afbacdc442e6c91d54c4f72aa6ccac03d))
* **193-02:** restore coverage thresholds to 70% ([bbd8c06](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bbd8c06f934384958470ef774ee2f8df3195235e))


### Bug Fixes

* **admin:** move global notification toggle outside Telegram FieldGroup ([#101](https://github.com/minhoyoo-iotrust/WAIaaS/issues/101)) ([10b7cd5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/10b7cd594a2387b80b1887e868b9d86046c98fb0))

## [2.3.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.3.0-rc.2...v2.3.0) (2026-02-19)


### Bug Fixes

* promote 2.3.0-rc to stable release ([017cdc6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/017cdc68771b1398ad7d661bd109d601260e1039))

## [2.3.0-rc.2](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.3.0-rc.1...v2.3.0-rc.2) (2026-02-19)


### Bug Fixes

* resolve all 7 open issues (094-100) ([#28](https://github.com/minhoyoo-iotrust/WAIaaS/issues/28)) ([1ee80b5](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ee80b51f8fdcb6e251d2dc303f65aff571b860f))

## [2.3.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.3.0-rc...v2.3.0-rc.1) (2026-02-19)


### Features

* **quick-5:** add build-time version sync for skill files ([ede3a3e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ede3a3e90d7a3bcf80a4b92ffd4be0360e3e5d30))
* **quick-5:** add Connection Discovery section to quickstart skill ([49075cb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/49075cb4e6f7426532d1df17480562cfc6e30a95))
* **quick-6:** add agent connection prompt utility and Admin UI copy buttons ([fb5c78d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fb5c78d9fe7057b739b70bbf7db05dca24f6b75b))
* **quick-6:** add magic word output to CLI quickstart and skill file guide ([b52f5e8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b52f5e8e144eebe31e52f3755d26ca73bbfbf17a))
* **quick-8:** add quickset as primary command with quickstart as alias ([befbd25](https://github.com/minhoyoo-iotrust/WAIaaS/commit/befbd25ae26b136b464464b0eff66bafe3a1b45f))


### Bug Fixes

* **ci:** lower admin coverage threshold and fix nightly Solana setup ([def9acf](https://github.com/minhoyoo-iotrust/WAIaaS/commit/def9acfa833b4cf2e8d8ef54bfe1c7394f87810e))
* **ci:** lower admin coverage threshold and fix nightly Solana setup ([7976307](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7976307e0eb09056db218fae959e9468a1926ffc))
* **quick-1:** add master password validation at daemon startup (Step 2b) ([b91d2b3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b91d2b30b43deb090c82d88557cebfaa5e2dbff6))
* **quick-3:** correct homepage URLs and add bugs field in all package.json ([68a99d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68a99d7d6c44d80b3e5753e00e177eb73919cf3d))
* **quick-4:** always initialize NotificationService regardless of config.toml enabled ([3a54be4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3a54be47a2565a3c652a96966634cac1fd675436))
* **quick-7:** update JWT rotation UI text to user-facing language ([cd1215b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cd1215bd9678c0e45a8b06c5d87ae36ff1bbaffb))

## [2.3.0-rc](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.2.1...v2.3.0-rc) (2026-02-19)


### Features

* npm Trusted Publishing with OIDC provenance (v2.4) ([80a8148](https://github.com/minhoyoo-iotrust/WAIaaS/commit/80a81487bc7090edc8c1750e5f295d26dd678904))
* npm Trusted Publishing with OIDC provenance (v2.4) ([80a8148](https://github.com/minhoyoo-iotrust/WAIaaS/commit/80a81487bc7090edc8c1750e5f295d26dd678904))

## [2.2.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.2.0-rc.1...v2.2.1) (2026-02-18)

Stable release — promoted from v2.2.1-rc.1. Includes CI affected detection fix and smoke test daemon path resolution.

## [2.2.1-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.2.0-rc.1...v2.2.1-rc.1) (2026-02-18)


### Bug Fixes

* **ci:** resolve daemon path without exports subpath in smoke test ([9c1d708](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9c1d7086e6ccf7ba7fc489148a9e10d2e0f93ccf))
* **ci:** resolve daemon path without exports subpath in smoke test ([5686665](https://github.com/minhoyoo-iotrust/WAIaaS/commit/568666537466dcad770ec69d6a521513062b57cb))

## [2.2.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.1.4-rc.1...v2.2.0-rc.1) (2026-02-18)


### Features

* **182-01:** add TabNav, FieldGroup components and FormField description prop ([ad1e6c3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ad1e6c3f43c5d406ae463e58740913560d91c551))
* **182-02:** add PageHeader subtitle and Breadcrumb component ([1ca647a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ca647a2e3db1d77eb7650cd3d1efb9e8ebed162))
* **183-01:** update sidebar to 7 menus with Security/System, add route redirects ([47cc832](https://github.com/minhoyoo-iotrust/WAIaaS/commit/47cc8321dd8d493b678b2bba93f5d04ae4fb2d93))
* **183-02:** create Security page with Kill Switch, AutoStop Rules, JWT Rotation tabs ([dfb22ee](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dfb22ee4e1259454a326e9c6aab6ee416ec54157))
* **183-02:** wire SecurityPage into layout.tsx router ([c7c9fd8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c7c9fd85010bc8aa687b375170ea77dbe06fe892))
* **183-03:** add TabNav + Breadcrumb to Wallets, Sessions, Policies, Notifications pages ([2f325dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2f325dc27205b59a4597d4c63750bfe15935b851))
* **183-03:** create System page with 6 sections (API Keys, Oracle, Display, Rate Limit, Log Level, Danger Zone) ([31b644f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/31b644f487f8746c7b1e5f92897f3fb97c73f539))
* **184-01:** add relay_url and session label mappings to settings-helpers ([d8608d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d8608d1e12bb61d75b493def115a90a6d6534a04))
* **184-01:** implement RPC, Balance Monitoring, WalletConnect tabs in wallets page ([69dd846](https://github.com/minhoyoo-iotrust/WAIaaS/commit/69dd84675b4594793fa8cbf6b31ba888120b8374))
* **184-02:** implement Notifications Settings tab and Security AutoStop FieldGroups ([c02e577](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c02e5772d8be16aaffde21cfa045b4473858d87a))
* **184-02:** implement Sessions Settings tab and Policies Defaults tab ([a0cd3d2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a0cd3d29961725c8c243cddefe5b735bfcaeff61))
* **185-01:** create settings search index and search popover component ([7012bb1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7012bb1bc717d23d2b55b8c9f59b2d750df25c28))
* **185-01:** wire search into header with Ctrl+K shortcut and field highlight ([5e7a151](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5e7a15163d4b8b0cff841db01b683e97c8b3cbb8))
* **185-02:** add dirty guard registry and unsaved changes dialog ([a52c351](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a52c351e7e54a218799d07a8687238603cd7bc15))
* **185-02:** wire dirty guard into TabNav, sidebar, and all settings pages ([3b651b8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3b651b80add235e923e5c4672d34e91b069fd484))
* **186-01:** add description help text to all settings FormField components ([9e5d112](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9e5d112b20c1b550ea8b595fa6deadeb8620c60f))
* **186-01:** update README.md Admin UI section to 7-menu structure ([ba0a721](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ba0a72128f2efe6bbc92db2d64fbff391fbe6e4f))


### Bug Fixes

* **187-01:** CurrencySelect highlight and duplicate search index ID ([0a21d5d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a21d5df0438d66e135faa0d7f93e598d871ccfe))
* **admin:** lower coverage thresholds to match v2.3 actual coverage ([b144c1b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b144c1bbe0abe5ce02e9374b632f18db5296e1b4))
* **ci:** update stale test text and fix affected detection on push ([d15c95b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d15c95b6aa57ab1285f463651695ad686fe27f14))
* **ci:** update stale test text and fix affected detection on push ([cb42573](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cb4257387e58dfe291e6f0b8bfbaafa875bb004a))
* include Admin UI static files in daemon npm package ([6c05879](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c058794b4fe0f40fdbe32919e8a8643dc0a37fc)), closes [#084](https://github.com/minhoyoo-iotrust/WAIaaS/issues/084)


### Code Refactoring

* **183-01:** extract shared settings helpers to utils/settings-helpers.ts ([f80bf31](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f80bf31da0ee1cb4f6e7fcb802f29dd879b9a443))

## [2.1.4-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.1.3-rc.1...v2.1.4-rc.1) (2026-02-18)


### Bug Fixes

* use pnpm publish with prerelease tag detection in release workflow ([b06f03b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b06f03b84aac7816d8e447332a9fecff740cd469))
* use pnpm publish with prerelease tag detection in release workflow ([3fd683e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3fd683e19b2f54454af75d19d27ebdd020640d28))

## [2.1.3-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.1.2-rc.1...v2.1.3-rc.1) (2026-02-18)


### Bug Fixes

* **178:** revise plans based on checker feedback ([f493fcc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f493fcc240101a9ac6c3c97967cbaf7eb562c0a0))
* **181-01:** restore coverage thresholds to original levels ([ed2db15](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ed2db1525c311c838be95e861bdac7cf233eb921))
* resolve 3 open issues ([#078](https://github.com/minhoyoo-iotrust/WAIaaS/issues/078) [#079](https://github.com/minhoyoo-iotrust/WAIaaS/issues/079) [#080](https://github.com/minhoyoo-iotrust/WAIaaS/issues/080)) ([1b493ed](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1b493edeb15fb56d3856d63978b98d70a73f6197))
* resolve lint errors in adapter-solana test files ([18dd767](https://github.com/minhoyoo-iotrust/WAIaaS/commit/18dd767f977f309055ff9c02f383c25d37de8b9b))
* resolve lint errors in adapter-solana test files ([f141cf6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f141cf6306b56a4988264c7b55353634d96280f5))
* resolve typecheck errors in adapter-solana tests ([4ff6218](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4ff6218afcf18c4a9ad23a2cb2d1edcb55ff4d2a))

## [2.1.2-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.1.1-rc.1...v2.1.2-rc.1) (2026-02-18)


### Bug Fixes

* remove duplicate path prefix in smoke test pnpm pack output ([#077](https://github.com/minhoyoo-iotrust/WAIaaS/issues/077)) ([d400ed0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d400ed06e36bd1721763ab72f563a462c3b76eaa))

## [2.1.1-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.1.0-rc.1...v2.1.1-rc.1) (2026-02-18)


### Bug Fixes

* use pnpm pack instead of npm pack in smoke test ([#076](https://github.com/minhoyoo-iotrust/WAIaaS/issues/076)) ([09ba1c1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/09ba1c106c9cd825d7826291e41f84e4463a0b29))

## [2.1.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.0.0-rc.1...v2.1.0-rc.1) (2026-02-18)


### Features

* **172-01:** add OpenAPI validation step to release.yml test job ([2511294](https://github.com/minhoyoo-iotrust/WAIaaS/commit/251129443a9303c11a0dd7daa5e624aa1b1ba6b2))
* add npm package smoke test — pack + install + import verification ([899ee8f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/899ee8f66313ec8328d8d5a975d926457ca36d81))
* wallet auto-session, session TTL extension, README rewrite, CLAUDE.md translation ([b1c8f02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b1c8f02ede516bafdfd67d455af501012023c59c))


### Bug Fixes

* **171:** revise plans based on checker feedback ([5a4260c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5a4260c68f0be338b6e1f01cd2483dca327c34c3))
* **docs:** correct skill names, broken links, and hardcoded version ([0c831ae](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0c831ae56bffe7ff4bb15db8e5dd44cdf1b41470))
* remove hardcoded release-as from release-please config ([0b08ddc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0b08ddc3882d4b83c6764df062ce81c18e72c54b))
* update validate-openapi.ts [@see](https://github.com/see) path after doc reorganization ([2780c7f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2780c7f60e542561f2a50140020086eaa2244d9a))

## [2.0.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.0.0-rc.1...v2.0.0-rc.1) (2026-02-17)


### Features

* [#048](https://github.com/minhoyoo-iotrust/WAIaaS/issues/048) Owner 자산 회수(Withdraw) REST API 구현 ([3f1bb8f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3f1bb8f55358934b1e425dd80e47fcb741946dd0))
* **125-02:** implement InMemoryPriceCache ([318b043](https://github.com/minhoyoo-iotrust/WAIaaS/commit/318b043989f1c8831987fbaceb99442c3287a183))
* **125-02:** implement IPriceOracle types + classifyPriceAge ([8ab3e64](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ab3e64226e60f9cf03550b5aa7f91b0b5fa4cf2))
* **126-01:** PythOracle implements IPriceOracle -- Hermes REST API (GREEN) ([c16b022](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c16b02279d46a37b48fb814b8c2e25af0569736e))
* **126-02:** CoinGeckoOracle implements IPriceOracle -- Demo API (GREEN) ([93097d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/93097d1aed56e67617648ffcf92bf3be5166f0bc))
* **126-03:** OracleChain 3단계 fallback + 교차 검증 + GET /admin/oracle-status (GREEN) ([4c59e44](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c59e4499fc98337628e64bc650da8eb1a3becd8))
* **127-01:** PriceResult 3-state + resolveEffectiveAmountUsd 5-type 구현 (GREEN) ([6d16736](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6d16736477c5bd5e1a11564e0c6c84304222ca86))
* **127-02:** SpendingLimitRulesSchema Zod SSoT + evaluateSpendingLimit USD 분기 ([ff3c8c0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff3c8c099a1560bd5fe1551639a3e9b304fedbb6))
* **127-03:** OracleChain DI 연결 + PipelineContext priceOracle 주입 ([e75fb18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e75fb1823b545fc323bce8a75bf389c82984c0e7))
* **127-03:** Stage 3 파이프라인 USD 통합 + notListed 격상 + oracleDown fallback + 힌트 ([9793d80](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9793d80611e01fe7085bf7ecdb2c9c617952413f))
* **128-01:** ActionProviderRegistry 구현 + 단위 테스트 20개 ([992bb8c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/992bb8c41b8d5a514432b9edacd2e90ca886edd0))
* **128-01:** IActionProvider Zod SSoT 인터페이스 정의 + API_KEY_REQUIRED 에러 코드 ([8625f48](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8625f4829f2723c35e44ac562e953cc838decadc))
* **128-02:** api_keys 테이블 Drizzle 스키마 + DB v11 마이그레이션 ([4f1c113](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f1c1134e6c42fe0e6d600c22510f3fe2ca63fb8))
* **128-02:** ApiKeyStore 암호화 저장소 + 단위 테스트 14개 ([deb6b6d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/deb6b6d0ebff62925bb068c4d2da879ca61054b9))
* **128-03:** POST /v1/actions/:provider/:action REST API + DaemonLifecycle Step 4f ([a0c9aa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a0c9aa3d35a00c685d4299e28908c78883b59e06))
* **128-04:** Admin UI API Keys 섹션 + 엔드포인트 상수 ([c6ad400](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6ad40033b6917f428a294fb41fa1304f83e3ee9))
* **128-04:** GET/PUT/DELETE /v1/admin/api-keys REST API + 통합 테스트 ([d5702ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5702aca603f2f9b8a3f15bb4664cd4d9d0a2534))
* **129-01:** Action Provider -&gt; MCP Tool 자동 변환 함수 구현 ([7938b28](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7938b285c8b9f09089fc9e640d25293c59df0999))
* **129-01:** index.ts 통합 + Action Provider MCP 도구 단위 테스트 ([c3d60e2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3d60e2cfe27b9f934cd96fe5d1fe017072eb4e9))
* **129-02:** actions.skill.md v1.5.0 신규 생성 -- Action Provider REST API 문서화 ([495aaf4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/495aaf4ac264ebea59aa7ce540581506497ba6f2))
* **129-02:** admin.skill.md v1.5.0 -- oracle-status + api-keys 섹션 추가 ([146944c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/146944c7357281dda94eec309c7823d68f368e46))
* **130-01:** @x402/core 의존성 + Enum 확장 + x402.types.ts + 에러 코드 + i18n ([12225c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12225c603ce99a7c131fa80282d237234ae9a04b))
* **130-02:** v12 DB 마이그레이션 추가 (transactions + policies CHECK 제약 갱신) ([9d54973](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d54973268c1fc5a369ab800b9f2cdbab277d192))
* **131-01:** SSRF 가드 구현 (GREEN) -- 54개 테스트 전체 통과 ([e6fd24b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e6fd24bd964d53066068803c42a22345a9c7859f))
* **131-02:** x402 핸들러 구현 (GREEN) ([0681e3f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0681e3f98ce3404ca9ee95634ababa3f57b08e3b))
* **131-03:** 결제 서명 모듈 구현 (GREEN) -- EVM EIP-3009 + Solana TransferChecked ([d9d4311](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d9d431104912f1e3872b351cc3170b78f9d1ad88))
* **132-01:** config.toml [x402] 섹션 추가 (enabled, request_timeout) ([9763da9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9763da96f04fa6f426d366a36c9bfe2124944271))
* **132-01:** matchDomain + evaluateX402Domain 도메인 정책 평가 구현 ([9252c8d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9252c8dd09110944c95a2a3f19f2fecfcc433ce6))
* **132-02:** x402 결제 금액 USD 환산 모듈 구현 (GREEN) ([cd24aca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cd24aca57b4a3ff1029cc06ea9e31f49e7c34c35))
* **132-03:** POST /v1/x402/fetch 라우트 + 오케스트레이션 구현 ([7a48e23](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7a48e23ef161e9e9c5010ab9f2b36ada5e87ce78))
* **132-03:** server.ts에 x402 라우트 등록 + sessionAuth 경로 매핑 ([b5f300a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b5f300a9b7211d4633128460e005407901f96448))
* **133-01:** Python SDK x402_fetch 모델 + 메서드 + 5개 테스트 ([17f757d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17f757d44ec0b8d611b7517cf22e821dec99a5ce))
* **133-01:** TS SDK x402Fetch 타입 + 메서드 + 4개 테스트 ([52f1b3b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/52f1b3b089733c72b87d97f26a83d80caa424aa2))
* **133-02:** MCP x402_fetch 도구 + 6개 테스트 + server.ts 등록 ([53ed76d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/53ed76d4975d436d1ac470622175e227e0749e89))
* **133-02:** x402.skill.md + transactions.skill.md 갱신 + VALID_SKILLS/SKILL_NAMES 등록 (7개) ([8888fd8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8888fd8604bb25a0885a43595e8fa4ac4d926ebb))
* **134-01:** 4개 미등록 PolicyType Zod rules 스키마 추가 ([0fe0852](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fe085238a7b2bffbff94fe469e989620e55d4e5))
* **134-01:** DynamicRowList + PolicyFormRouter + JSON 토글 + policies.tsx 리팩터링 ([b3b65be](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3b65beb1a07482c0a0fa52a13d888b81d8ea544))
* **134-02:** 5개 타입 전용 폼 컴포넌트 + PolicyFormRouter 통합 + 유효성 검증 ([6f6dc5f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6f6dc5f061bc1b1658031cf61285421d9195eb51))
* **135-01:** 7개 타입 전용 폼 컴포넌트 + PolicyFormRouter 12-type 통합 ([f846423](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f846423239dfafd187d246c651322d407a01cd8f))
* **135-01:** validateRules 7개 타입 유효성 검증 추가 ([1195b51](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1195b51ab69496b37f3d660d060daa118e4aa635))
* **135-02:** PolicyRulesSummary 12-type 시각화 + 수정 모달 전용 폼 프리필/저장 통합 ([71ac3ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71ac3ff622be9821677ff3197905d8deb75ee890))
* **136-01:** DB v13 마이그레이션 + Drizzle 스키마 + SpendingLimitRulesSchema 확장 ([90e5adb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/90e5adb5a9414fa75cf2e1df27b183b30d3750ad))
* **136-01:** evaluateAndReserve USD 기록 + releaseReservation 확장 + v13 마이그레이션 테스트 ([edd1db7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/edd1db79819aa5d96eed3fba6a2b48232e5694db))
* **136-02:** evaluateAndReserve 누적 USD 집계 + APPROVAL 격상 + Stage 3 알림 + 테스트 ([acd5d7d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/acd5d7d1208babbb034c2804520dbe456fb2488e))
* **136-02:** PolicyEvaluation 확장 + CUMULATIVE_LIMIT_WARNING 이벤트 + approval-workflow USD 클리어 ([a9cce6c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a9cce6c96be1aa9aed6c56f940ada90d6e13057e))
* **137-01:** PolicyRulesSummary 누적 한도 시각화 + CSS 스타일 추가 ([04ce084](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04ce084ed2a0b1ff6fae303b0afd173b414fa2e3))
* **137-01:** SpendingLimitForm 누적 한도 입력 필드 + 검증 로직 추가 ([f5aabcc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f5aabccdb639a7a1cf38065e37d2daada6f15548))
* **137-02:** TS/Python SDK에 SpendingLimitRules 타입 추가 ([f9bcd70](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9bcd702786cc354e47f9302c6ba69cdf465a781))
* **138-01:** formatDisplayCurrency 유틸리티 + GET /admin/forex/rates + 테스트 39개 ([932c8d0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/932c8d07c59820f18c83bc0a53e9abddab502c37))
* **138-01:** IForexRateService 인터페이스 + CoinGeckoForexProvider + ForexRateService + 43개 통화 메타데이터 ([fd19184](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd1918404fd3bdc9d1530a031cc5555342d30155))
* **138-02:** Admin Settings 통화 드롭다운 (CurrencySelect) + Display 섹션 + CSS ([a84a0d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a84a0d71a41d885ad708278994c7c93ad201e117))
* **138-02:** config.toml display 섹션 + SettingsService display 카테고리 + ForexRateService daemon 통합 ([1a8a777](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1a8a7773eaab549447597d6c459ade72c737ac87))
* **139-01:** Admin UI 환산 표시 유틸리티 + 대시보드 amountUsd 통합 ([fd6433c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd6433c105a5864b90cedc54fc9a1c51fe7e26d9))
* **139-01:** 알림 메시지에 display_amount 환산 금액 통합 ([358f8f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/358f8f6d1aef74275cb0f213f07fe07c96a95651))
* **139-02:** MCP 도구 display_currency 파라미터 + 스킬 파일 동기화 ([272a84f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/272a84f52577667da1b46504e5aa55dcdc5ecbd0))
* **139-02:** REST API 4개 엔드포인트에 display_currency 쿼리 파라미터 + 환산 필드 추가 ([621c26f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/621c26f281b478e23750f5ee2aaa0d5b09af82fa))
* **140-01:** EventBus 인프라 + 이벤트 타입 정의 ([d666c46](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d666c46c708d7df746be9b8d57d2c581fd746825))
* **140-01:** 파이프라인 + 라우트에서 EventBus 이벤트 동시 발행 ([fe11fba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe11fbaa4fdb2b3971e4598ab7378f621a1b93b4))
* **140-02:** DB v14 마이그레이션 + kill_switch_state 값 변환 ([11467f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/11467f64ca464fbb95304354dfefcaffd0bb0297))
* **140-02:** KillSwitchService 3-state 상태 머신 + CAS ACID 패턴 ([ba86248](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ba86248ae99ebedddf282b7ef4fce7de1748aaff))
* **140-03:** Kill Switch 6-step cascade + killSwitch 미들웨어 3-state 리팩토링 ([d014554](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0145541051fd5d2d141e11883aab2916cd0edd4))
* **140-03:** Kill Switch REST API + dual-auth 복구 + DaemonLifecycle 통합 ([6c1348c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c1348ce22648dcdfbd223572ac28aea4b2881da))
* **141-01:** AutoStopService 4 규칙 엔진 + EventBus 구독 구현 ([19d3e96](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19d3e965760a4c4f1a55d6fd9b708eca8480b78b))
* **141-02:** AutoStop config.toml 6개 키 + Admin Settings autostop 카테고리 + i18n 범용 템플릿 ([7f3fc81](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f3fc81d85049eea426778dc853d395ff01fa2b7))
* **141-02:** DaemonLifecycle AutoStop 통합 + hot-reload + 16개 통합 테스트 ([414d601](https://github.com/minhoyoo-iotrust/WAIaaS/commit/414d6016d1c81e74d7db4ba826a0012b133c3a49))
* **142-01:** BalanceMonitorService 코어 구현 + 15개 단위 테스트 ([62d1537](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62d15377756f1001623f8ae154855ee571080ab1))
* **142-01:** LOW_BALANCE NotificationEventType + i18n 템플릿 추가 ([1bc0bc8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1bc0bc8834fe19e66d4f7c1f2fbb748138ca67ac))
* **142-02:** config.toml monitoring flat key + Admin Settings + HotReload 통합 ([fddad2d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fddad2d996af3669482a4469b565d4c7f4a678df))
* **142-02:** DaemonLifecycle 통합 + 통합 테스트 14개 ([c390646](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c39064672f7fb5669788f36a20e2bc409ed658bd))
* **143-01:** DB 마이그레이션 v15 + Drizzle 스키마 + config/settings 확장 ([215bdd8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/215bdd824604f332e61434ba3e3e85b794175b00))
* **143-01:** TelegramBotService Long Polling + /start, /help, /status + DaemonLifecycle + i18n ([430205a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/430205a8d02057f57d286ebc219469622d033e1b))
* **143-02:** 2-Tier 인증 + /wallets, /pending, /approve, /reject 명령어 ([f601b04](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f601b040f219abfd82605273dd5f56995ea00ad2))
* **143-02:** Admin REST API -- telegram_users 관리 엔드포인트 3개 ([173432e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/173432e38a9e1fd7991e01fb263437a552e5d948))
* **143-03:** 인라인 키보드 빌더 + /killswitch 확인 대화 + /newsession 월렛 선택 ([9cf709d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9cf709d93b44635b3b7ddc527a71e8dec67094b5))
* **144-01:** Kill Switch 3-state UI 리팩토링 + API 엔드포인트 추가 ([e974d2a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e974d2a5408d49778c453e10a348fd9ad2673c72))
* **144-01:** Telegram Users 관리 페이지 + 사이드바 라우트 추가 ([f10dd49](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f10dd495e9ff37b2a41d630c55cffd171b8887f4))
* **144-02:** AutoStop + Balance Monitoring Settings 섹션 추가 ([5600f9c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5600f9cb78436d944d14f2a8b64692f0a2fedc35))
* **145-01:** entrypoint.sh + docker-compose.yml 생성 ([91a050a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/91a050aa11c347257c94c872a6f292380847cca7))
* **145-01:** Multi-stage Dockerfile + .dockerignore 생성 ([d40cce0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d40cce0e5ee07ae9ab36c76879773e29d6fcf935))
* **145-02:** Docker Secrets 오버라이드 compose 파일 + 보안 설정 ([23b2b31](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23b2b31abf55b4fe02dd146a9d54436f7640d278))
* **146-01:** DaemonLifecycle WC 통합 (Step 4c-6 초기화 + shutdown 해제) ([112c4da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/112c4da7bfe88562e839df905d2fed53dc9ed6f4))
* **146-01:** WC 인프라 - SqliteKeyValueStorage + WcSessionService + DB v16 마이그레이션 ([676454b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/676454b9ee7c9063c8251c3daec3a92df9a6cdb1))
* **146-02:** hot-reload에 walletconnect 키 변경 감지 추가 ([6513dda](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6513dda728411d2dc063996e1e0afbcf3c85e31c))
* **147-01:** WC REST API 4개 엔드포인트 + OpenAPI 스키마 + 18개 단위 테스트 ([1cb8d60](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1cb8d60721f3e15c36a62340bdc4a4261d73b19f))
* **147-01:** WcSessionService 페어링/세션 관리 메서드 + CAIP-2 상수 + 에러 코드 ([54563b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54563b4e5e0fa7927c3ef29af61d7855712cb204))
* **147-02:** Admin UI WalletConnect QR 모달 + 세션 관리 섹션 ([7667967](https://github.com/minhoyoo-iotrust/WAIaaS/commit/76679678c65b6c2286003ed42fdae3b1b0932132))
* **147-02:** CLI owner connect/disconnect/status 명령어 + qrcode 터미널 출력 ([bc5f9e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bc5f9e0f4b848821d27dbc2d6122700e98132595))
* **148-01:** stage4Wait WC 연동 + 전체 DI 배선 ([a1eb63f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a1eb63f22bf7d5f25155f85748bc2d5f1d55af6e))
* **148-01:** WcSigningBridge 서비스 생성 ([9edaa57](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9edaa576436af80220cb85ab1c687b9044dbe6ec))
* **149-01:** EventBus 이벤트 + 알림 타입 + i18n 템플릿 추가 ([e0e51c2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0e51c2cfcc2b357242d34d746368792ada8fe5a))
* **149-01:** WcSigningBridge Telegram fallback + approval_channel 추적 + DI 배선 ([aaadc33](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aaadc33eab07ce237837510a850a5ae0fae3a731))
* **150-01:** Admin UI WalletConnect 전용 관리 페이지 ([9381b42](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9381b42654f0b37435073b724df8d1178838a178))
* **150-01:** session-scoped WC REST endpoints (/v1/wallet/wc/*) ([3cb2ae1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3cb2ae1a29cb862e46819aba605b02c144917163))
* **150-02:** MCP ApiClient.delete() + 3 WC 도구 (wc_connect, wc_status, wc_disconnect) ([8887fbd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8887fbdffeefc3f1fac70b7f9fd47578840d9f18))
* **150-02:** TS/Python SDK WC 메서드 + Skill 파일 WalletConnect 섹션 ([b0c698a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0c698aa5ab8aa7e9f3f4bef4a1c73a8ce4efdff))
* **151-01:** Turborepo 5개 테스트 태스크 분리 + 패키지 스크립트 ([c01cc18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c01cc18956e00e2829772022473dc7c4a40b8fcd))
* **151-02:** MockOnchainOracle + MockPriceOracle + MockActionProvider (M8-M10) + barrel export + 검증 테스트 ([bc27c0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bc27c0d7b50971efd439f1708c3bcbf387f5de31))
* **151-02:** msw 2.x 설치 + Jupiter/가격 API msw 핸들러 (M6, M7) ([46a01da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46a01da251671926eb7d00e56df3135c3198a981))
* **152-01:** Enum SSoT 빌드타임 검증 스크립트 + DB 일관성 테스트 ([452d406](https://github.com/minhoyoo-iotrust/WAIaaS/commit/452d406897d5de5e325cdf9992e77a74bee9ba91))
* **160-01:** BackgroundWorkers runImmediately + VersionCheckService 구현 ([8ad9759](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ad9759584731510a779ff8be6c588ffb2880654))
* **160-02:** GET /health에 latestVersion, updateAvailable, schemaVersion 필드 추가 ([57352eb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/57352ebaf9387cc92f585c04aa248c6fb3bc97f1))
* **161-01:** CLI 업그레이드 알림 모듈 구현 ([b03eba2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b03eba24299e4d0259559c6370a34c52764f8df2))
* **161-02:** BackupService 구현 + barrel export ([b0b011c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0b011ce33513f212ed2da98a10cb697391adcd2))
* **161-03:** upgrade 명령 구현 + CLI 등록 ([68bccd7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68bccd7b2c4ce184561adcbae469c53631747f96))
* **162-01:** checkSchemaCompatibility 함수 + 호환성 매트릭스 테스트 ([f8a55d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f8a55d626f0d13e2efa8442822c6b30994192454))
* **162-01:** daemon Step 2 호환성 검사 통합 + SCHEMA_INCOMPATIBLE 에러 코드 ([f638eb4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f638eb4e8d44bbedc668105a462db4ddf49a5d4d))
* **162-02:** Dockerfile에 Watchtower + OCI 표준 라벨 추가 ([64d3c1d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/64d3c1dfc5f88b30b147be1423d328bd743a845a))
* **162-02:** release.yml에 docker-publish job 추가 (GHCR 3-tier 태깅) ([a60db52](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a60db524ca35939a2fc093b56fabaaf840fbada3))
* **163-01:** release-please 설정 파일 3종 생성 ([115e4f9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/115e4f916f947bdc1df6ec2d6a58a1de59e9040e))
* **163-02:** release.yml에 deploy job 추가 (게이트 2) ([f639e61](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f639e614dd89f6c2292202f63ee212ebb1b27475))
* **164-01:** SDK HealthResponse 타입 추가 + 스킬 파일 /health 응답 동기화 ([c6ab810](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6ab810e2d2e3abaf800467f1a00157ff3dd450d))
* **166-02:** OpenAPI 스펙 유효성 검증 스크립트 + swagger-parser 도입 ([34d44a4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34d44a4924d39ab1dcd935cccc2229e60b8ef626))
* **169-01:** @waiaas/skills 패키지 scaffolding + 스킬 파일 번들링 ([3a59221](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3a592215f9b2f78f43fd9e9b377c1324d5d1c710))
* **169-01:** CLI 구현 (list/add/help 명령) + npm publish dry-run 검증 ([e0410ab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0410aba3d03f44c3e90be588fe457f5c30c309b))
* **169-02:** examples/simple-agent SDK 예제 에이전트 구현 ([2573266](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2573266a8073b0082060f9ccce11480072c9e173))
* **170-02:** release.yml 전면 업데이트 -- 8패키지 publish + Docker Hub + dry-run 제거 ([5e8ef95](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5e8ef95a3650cdabd24c416f121f6d8e7f0f2638))
* v1.7 품질 강화 + CI/CD ([1ad8328](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ad8328176f4bf65b5eb398114b3b290f98635e6))
* **v2.0:** activate RC pre-release pipeline for npm + Docker Hub ([44135cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/44135cc6b9f113c3027e29a6c9806a5258895ad5))
* 마일스톤 감사/완료 전 빌드+테스트 자동 실행 훅 추가 ([#039](https://github.com/minhoyoo-iotrust/WAIaaS/issues/039)) ([45bb693](https://github.com/minhoyoo-iotrust/WAIaaS/commit/45bb693357bc7fe37ab164a64442d4d32a05d880))


### Bug Fixes

* [#042](https://github.com/minhoyoo-iotrust/WAIaaS/issues/042) tsconfig.build.json 도입으로 빌드/테스트 분리 + [#049](https://github.com/minhoyoo-iotrust/WAIaaS/issues/049) SignClient ESM/CJS interop ([0a45e67](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a45e6722f42b4dc0982e933a348c29a24064872))
* [#043](https://github.com/minhoyoo-iotrust/WAIaaS/issues/043) WalletConnect 미설정 시 404 대신 503 반환 + 에러 메시지 매핑 ([9c62171](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9c62171f05b0930a03c45445755fb75f8b15c6af))
* [#047](https://github.com/minhoyoo-iotrust/WAIaaS/issues/047) Terminate 시 리소스 정리 + TERMINATED 가드 적용 ([d6e353d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6e353d444427c84dfcebf29700800fcefaf3b3b))
* **125:** revise plans based on checker feedback ([12b1854](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12b1854c52b322ef476b28b1e7303f9d0df864e5))
* **167-02:** bash 3.x 호환성 수정 + Hard 커버리지 게이트 통과 ([20551d3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/20551d37e44a83aaa60c2d4479e4718d140c011e))
* **167-03:** EVM Sepolia 체인 테스트 타입 오류 수정 ([8f5c60f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8f5c60f330ce54b198cb51227c534dfcfd7c67b9))
* **168:** README.ko.md 문서 링크 경로 수정 ([61442f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/61442f0e115438fb1d870fd65970e56340a375e9))
* **admin:** Table 컴포넌트 undefined data 크래시 수정 + 테스트 카운트 갱신 ([#037](https://github.com/minhoyoo-iotrust/WAIaaS/issues/037), [#038](https://github.com/minhoyoo-iotrust/WAIaaS/issues/038)) ([f0ddcbc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f0ddcbc5c80d2a28999216b089421b43aa7c8d7d))
* core 스냅샷 테스트 기대값 갱신 + ROADMAP Progress 테이블 수정 ([623d9dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/623d9dc4cc0841bac97c62ebe0d13dec025e7203))
* Docker builder 스테이지에서 모든 패키지 빌드 ([573257f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/573257fd6ff5b066710b0aa7c163bbfbe4319155))
* listActions() noUncheckedIndexedAccess 수정 + 목표 문서 정비 ([d5b7417](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5b7417bbfcd7d0c3e8654ac9d9f995b04d56e58))
* lower adapter-solana branches coverage threshold to 65% ([#060](https://github.com/minhoyoo-iotrust/WAIaaS/issues/060)) ([1d29492](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d294924aaa5456b9b8a491747e4cde8c4ca3bc9))
* lower admin functions coverage threshold to 55% ([#061](https://github.com/minhoyoo-iotrust/WAIaaS/issues/061)) ([ebf7190](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ebf71900d1363d4f9a7c99075ad651eb3951a8e5))
* lower cli lines/statements coverage threshold to 65% ([#062](https://github.com/minhoyoo-iotrust/WAIaaS/issues/062)) ([d4f86ae](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4f86ae1cb93afc0cfbf7894bfa0dafa96cd830d))
* release-please PAT 설정 + RC 버전 수정 ([54f400e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54f400e5c7869c0a26f1dd422480a68d39c80b82))
* release-please 액션을 googleapis/release-please-action@v4로 업그레이드 ([13ac234](https://github.com/minhoyoo-iotrust/WAIaaS/commit/13ac2345a2358b5953e486ae6ba554a3bdd90c3c))
* remove unused catch binding in EVM adapter ([65118ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/65118ff7c470360c99eda3683b64d9c2a542cdc8))
* resolve all lint errors across packages ([dcb9c3a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dcb9c3aa6da1a93c0d6987523c39326b48babf77))
* resolve open issues [#063](https://github.com/minhoyoo-iotrust/WAIaaS/issues/063) [#064](https://github.com/minhoyoo-iotrust/WAIaaS/issues/064) — restore lint-renamed test variables ([b0436a1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0436a11084dcb49b642336431cbf68179d4161b))
* resolve typecheck errors in contract tests and security helpers ([e4a1241](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e4a1241d077e0b50fa65a27d55795c045d4c33ca))
* Solana setup 액션을 Anza 공식 인스톨러로 교체 ([aad10f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aad10f0ac6a94eb2039361adaead21364ae0ff50))
* use relative paths for CI coverage report action ([#065](https://github.com/minhoyoo-iotrust/WAIaaS/issues/065)) ([eea8085](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eea8085436a7b8fd04c2f138b07c6c9332e8c52e))
* 오픈 이슈 [#058](https://github.com/minhoyoo-iotrust/WAIaaS/issues/058) [#059](https://github.com/minhoyoo-iotrust/WAIaaS/issues/059) 해결 — WC 셧다운 DB 가드 + Contract Test 커버리지 제외 ([14aa4b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14aa4b70c408b31b98b18160e5ff9369cf63d98d))
* 오픈 이슈 5건 일괄 수정 ([#053](https://github.com/minhoyoo-iotrust/WAIaaS/issues/053)-[#057](https://github.com/minhoyoo-iotrust/WAIaaS/issues/057)) ([0c93e87](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0c93e87e2304a7172c6ae601e488dc0d2342820d))
* 이슈 [#040](https://github.com/minhoyoo-iotrust/WAIaaS/issues/040)-[#052](https://github.com/minhoyoo-iotrust/WAIaaS/issues/052) 일괄 처리 + v1.8 objective 문서 수정 ([9ba7c2c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9ba7c2c8e9a8d7e50cd1b9cc1c01d33c132fbdae))
* 이슈 033~036 수정 + 로드맵 재편 (Desktop v2.6 이연) ([04ee9ab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04ee9ab6ba35042fb6bbfa57f371f4991075db48))

## [2.0.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v2.0.0-rc.1...v2.0.0-rc.1) (2026-02-17)


### Bug Fixes

* Solana setup 액션을 Anza 공식 인스톨러로 교체 ([aad10f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aad10f0ac6a94eb2039361adaead21364ae0ff50))

## [2.0.0-rc.1](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v1.8.0...v2.0.0-rc.1) (2026-02-17)


### Features

* **166-02:** OpenAPI 스펙 유효성 검증 스크립트 + swagger-parser 도입 ([34d44a4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/34d44a4924d39ab1dcd935cccc2229e60b8ef626))
* **169-01:** @waiaas/skills 패키지 scaffolding + 스킬 파일 번들링 ([3a59221](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3a592215f9b2f78f43fd9e9b377c1324d5d1c710))
* **169-01:** CLI 구현 (list/add/help 명령) + npm publish dry-run 검증 ([e0410ab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0410aba3d03f44c3e90be588fe457f5c30c309b))
* **169-02:** examples/simple-agent SDK 예제 에이전트 구현 ([2573266](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2573266a8073b0082060f9ccce11480072c9e173))
* **170-02:** release.yml 전면 업데이트 -- 8패키지 publish + Docker Hub + dry-run 제거 ([5e8ef95](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5e8ef95a3650cdabd24c416f121f6d8e7f0f2638))
* **v2.0:** activate RC pre-release pipeline for npm + Docker Hub ([44135cc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/44135cc6b9f113c3027e29a6c9806a5258895ad5))


### Bug Fixes

* **167-02:** bash 3.x 호환성 수정 + Hard 커버리지 게이트 통과 ([20551d3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/20551d37e44a83aaa60c2d4479e4718d140c011e))
* **167-03:** EVM Sepolia 체인 테스트 타입 오류 수정 ([8f5c60f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8f5c60f330ce54b198cb51227c534dfcfd7c67b9))
* **168:** README.ko.md 문서 링크 경로 수정 ([61442f0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/61442f0e115438fb1d870fd65970e56340a375e9))
* lower adapter-solana branches coverage threshold to 65% ([#060](https://github.com/minhoyoo-iotrust/WAIaaS/issues/060)) ([1d29492](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1d294924aaa5456b9b8a491747e4cde8c4ca3bc9))
* lower admin functions coverage threshold to 55% ([#061](https://github.com/minhoyoo-iotrust/WAIaaS/issues/061)) ([ebf7190](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ebf71900d1363d4f9a7c99075ad651eb3951a8e5))
* lower cli lines/statements coverage threshold to 65% ([#062](https://github.com/minhoyoo-iotrust/WAIaaS/issues/062)) ([d4f86ae](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d4f86ae1cb93afc0cfbf7894bfa0dafa96cd830d))
* release-please PAT 설정 + RC 버전 수정 ([54f400e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54f400e5c7869c0a26f1dd422480a68d39c80b82))
* release-please 액션을 googleapis/release-please-action@v4로 업그레이드 ([13ac234](https://github.com/minhoyoo-iotrust/WAIaaS/commit/13ac2345a2358b5953e486ae6ba554a3bdd90c3c))
* remove unused catch binding in EVM adapter ([65118ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/65118ff7c470360c99eda3683b64d9c2a542cdc8))
* resolve all lint errors across packages ([dcb9c3a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/dcb9c3aa6da1a93c0d6987523c39326b48babf77))
* resolve open issues [#063](https://github.com/minhoyoo-iotrust/WAIaaS/issues/063) [#064](https://github.com/minhoyoo-iotrust/WAIaaS/issues/064) — restore lint-renamed test variables ([b0436a1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0436a11084dcb49b642336431cbf68179d4161b))
* resolve typecheck errors in contract tests and security helpers ([e4a1241](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e4a1241d077e0b50fa65a27d55795c045d4c33ca))
* use relative paths for CI coverage report action ([#065](https://github.com/minhoyoo-iotrust/WAIaaS/issues/065)) ([eea8085](https://github.com/minhoyoo-iotrust/WAIaaS/commit/eea8085436a7b8fd04c2f138b07c6c9332e8c52e))
* 오픈 이슈 [#058](https://github.com/minhoyoo-iotrust/WAIaaS/issues/058) [#059](https://github.com/minhoyoo-iotrust/WAIaaS/issues/059) 해결 — WC 셧다운 DB 가드 + Contract Test 커버리지 제외 ([14aa4b7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/14aa4b70c408b31b98b18160e5ff9369cf63d98d))

## [Unreleased]

### Added
- User-facing documentation: README, CONTRIBUTING, deployment guide, API reference
- OpenAPI spec validation in CI (swagger-parser)
- Security test suite verification (460 tests)
- Coverage gate for CI pipeline
- Platform compatibility tests (macOS + Linux)

## [1.8.0](https://github.com/minhoyoo-iotrust/WAIaaS/compare/v1.7.0...v1.8.0) (2026-02-17)


### Features

* [#048](https://github.com/minhoyoo-iotrust/WAIaaS/issues/048) Owner 자산 회수(Withdraw) REST API 구현 ([3f1bb8f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3f1bb8f55358934b1e425dd80e47fcb741946dd0))
* **117-01:** sign-only 파이프라인 모듈 + evaluateAndReserve SIGNED 쿼리 확장 ([b7fdf02](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b7fdf02c6a027e0381f3dc6603466fb473c8cbf0))
* **117-02:** POST /v1/transactions/sign 라우트 + OpenAPI 스키마 추가 ([3ed2138](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3ed2138e00867cb1bcfe172f8187d0afbbeaedb1))
* **118-01:** ABI_ENCODING_FAILED 에러 코드 + OpenAPI 스키마 + encode-calldata 라우트 ([f5ee58c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f5ee58c5e88bdb1c79e8c8b642d02ea59bb0e91e))
* **118-01:** utils 라우트 등록 + sessionAuth + barrel export ([1dab80e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1dab80e620e29e4dad7b73d807c8b6420477298c))
* **118-02:** Python SDK encode_calldata + skill 파일 업데이트 ([2fb06ea](https://github.com/minhoyoo-iotrust/WAIaaS/commit/2fb06ea8aee8102d7a8e6cfacccb3d675d4a80e0))
* **118-02:** TS SDK encodeCalldata + MCP encode_calldata 도구 추가 ([28b9f21](https://github.com/minhoyoo-iotrust/WAIaaS/commit/28b9f21febdcc662bfd76a4e9358d6c89e5aedb6))
* **119-01:** Python SDK sign_transaction() + Pydantic 모델 ([4205921](https://github.com/minhoyoo-iotrust/WAIaaS/commit/42059211e0040411931b7d4a8ac1fe2eb4dac594))
* **119-01:** TS SDK signTransaction() + MCP sign_transaction 도구 ([59a0498](https://github.com/minhoyoo-iotrust/WAIaaS/commit/59a0498bff044a0cb986fa9b52ae1032c3f3ad95))
* **119-02:** MCP 스킬 리소스 ResourceTemplate + 테스트 업데이트 ([d2ee73b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d2ee73be58b07040cb09dfd0379d73112d4d54b0))
* **119-02:** SKILL_NOT_FOUND 에러 코드 + GET /v1/skills/:name 라우트 ([cd25b43](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cd25b43f7fca41188b760654776754ea2862444d))
* **119-03:** POLICY_VIOLATION 알림 보강 (extractPolicyType + enriched vars) ([5544963](https://github.com/minhoyoo-iotrust/WAIaaS/commit/55449638454fc5238f66a3c88032d68e404df62a))
* **121-01:** MCP graceful shutdown + stdin 종료 감지 구현 (BUG-020) ([9574884](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9574884b2e19e5fc670c836bcf65be08eb263a63))
* **122-01:** MCP set_default_network 도구 + CLI wallet 서브커맨드 + daemon 세션 스코프 엔드포인트 ([bdd6b93](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bdd6b938ff75bac6500b643d222a14f11e2dca3a))
* **122-01:** TS SDK + Python SDK setDefaultNetwork/getWalletInfo 메서드 추가 ([baf8f38](https://github.com/minhoyoo-iotrust/WAIaaS/commit/baf8f38930cafedf35f6ba23a0f3ac5a4328f204))
* **122-02:** daemon network=all 분기 (balance + assets) + 부분 실패 처리 ([972a208](https://github.com/minhoyoo-iotrust/WAIaaS/commit/972a208159c5ac1734e1e478d8e1d60bb4bdb7bc))
* **122-02:** MCP/SDK network=all + wallet.skill.md 업데이트 ([c833075](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c8330750466a43ccee561407a9d8677938daae5b))
* **123-01:** /admin/status API 응답 확장 -- 정책/트랜잭션 통계 및 최근 활동 ([2413907](https://github.com/minhoyoo-iotrust/WAIaaS/commit/241390784058dd75c150998e7e82d0d13ab6ce03))
* **123-01:** 대시보드 StatCard 링크 + 추가 카드 + 최근 활동 UI ([c1422fb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c1422fb218f7fa20508a1e9a6e3da033a2c134c2))
* **123-02:** 세션 전체 조회 API + walletName + Admin 월렛 잔액/트랜잭션 API ([a41b8a7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a41b8a76674d060a0930f0d1ea87962de451e476))
* **123-02:** 세션 전체 조회 UI + 월렛 상세 잔액/트랜잭션 UI ([72c7572](https://github.com/minhoyoo-iotrust/WAIaaS/commit/72c7572c942d20fc30b56361307c5f88d09fdfc0))
* **124-02:** DB 마이그레이션 v10 + 메시지 저장 + Slack 채널 + 스킬 파일 ([f28de2f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f28de2fc9b94a1befcf707c51a7a86346efc9e20))
* **125-02:** implement InMemoryPriceCache ([318b043](https://github.com/minhoyoo-iotrust/WAIaaS/commit/318b043989f1c8831987fbaceb99442c3287a183))
* **125-02:** implement IPriceOracle types + classifyPriceAge ([8ab3e64](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ab3e64226e60f9cf03550b5aa7f91b0b5fa4cf2))
* **126-01:** PythOracle implements IPriceOracle -- Hermes REST API (GREEN) ([c16b022](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c16b02279d46a37b48fb814b8c2e25af0569736e))
* **126-02:** CoinGeckoOracle implements IPriceOracle -- Demo API (GREEN) ([93097d1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/93097d1aed56e67617648ffcf92bf3be5166f0bc))
* **126-03:** OracleChain 3단계 fallback + 교차 검증 + GET /admin/oracle-status (GREEN) ([4c59e44](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4c59e4499fc98337628e64bc650da8eb1a3becd8))
* **127-01:** PriceResult 3-state + resolveEffectiveAmountUsd 5-type 구현 (GREEN) ([6d16736](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6d16736477c5bd5e1a11564e0c6c84304222ca86))
* **127-02:** SpendingLimitRulesSchema Zod SSoT + evaluateSpendingLimit USD 분기 ([ff3c8c0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ff3c8c099a1560bd5fe1551639a3e9b304fedbb6))
* **127-03:** OracleChain DI 연결 + PipelineContext priceOracle 주입 ([e75fb18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e75fb1823b545fc323bce8a75bf389c82984c0e7))
* **127-03:** Stage 3 파이프라인 USD 통합 + notListed 격상 + oracleDown fallback + 힌트 ([9793d80](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9793d80611e01fe7085bf7ecdb2c9c617952413f))
* **128-01:** ActionProviderRegistry 구현 + 단위 테스트 20개 ([992bb8c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/992bb8c41b8d5a514432b9edacd2e90ca886edd0))
* **128-01:** IActionProvider Zod SSoT 인터페이스 정의 + API_KEY_REQUIRED 에러 코드 ([8625f48](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8625f4829f2723c35e44ac562e953cc838decadc))
* **128-02:** api_keys 테이블 Drizzle 스키마 + DB v11 마이그레이션 ([4f1c113](https://github.com/minhoyoo-iotrust/WAIaaS/commit/4f1c1134e6c42fe0e6d600c22510f3fe2ca63fb8))
* **128-02:** ApiKeyStore 암호화 저장소 + 단위 테스트 14개 ([deb6b6d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/deb6b6d0ebff62925bb068c4d2da879ca61054b9))
* **128-03:** POST /v1/actions/:provider/:action REST API + DaemonLifecycle Step 4f ([a0c9aa3](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a0c9aa3d35a00c685d4299e28908c78883b59e06))
* **128-04:** Admin UI API Keys 섹션 + 엔드포인트 상수 ([c6ad400](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6ad40033b6917f428a294fb41fa1304f83e3ee9))
* **128-04:** GET/PUT/DELETE /v1/admin/api-keys REST API + 통합 테스트 ([d5702ac](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5702aca603f2f9b8a3f15bb4664cd4d9d0a2534))
* **129-01:** Action Provider -&gt; MCP Tool 자동 변환 함수 구현 ([7938b28](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7938b285c8b9f09089fc9e640d25293c59df0999))
* **129-01:** index.ts 통합 + Action Provider MCP 도구 단위 테스트 ([c3d60e2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c3d60e2cfe27b9f934cd96fe5d1fe017072eb4e9))
* **129-02:** actions.skill.md v1.5.0 신규 생성 -- Action Provider REST API 문서화 ([495aaf4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/495aaf4ac264ebea59aa7ce540581506497ba6f2))
* **129-02:** admin.skill.md v1.5.0 -- oracle-status + api-keys 섹션 추가 ([146944c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/146944c7357281dda94eec309c7823d68f368e46))
* **130-01:** @x402/core 의존성 + Enum 확장 + x402.types.ts + 에러 코드 + i18n ([12225c6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12225c603ce99a7c131fa80282d237234ae9a04b))
* **130-02:** v12 DB 마이그레이션 추가 (transactions + policies CHECK 제약 갱신) ([9d54973](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9d54973268c1fc5a369ab800b9f2cdbab277d192))
* **131-01:** SSRF 가드 구현 (GREEN) -- 54개 테스트 전체 통과 ([e6fd24b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e6fd24bd964d53066068803c42a22345a9c7859f))
* **131-02:** x402 핸들러 구현 (GREEN) ([0681e3f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0681e3f98ce3404ca9ee95634ababa3f57b08e3b))
* **131-03:** 결제 서명 모듈 구현 (GREEN) -- EVM EIP-3009 + Solana TransferChecked ([d9d4311](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d9d431104912f1e3872b351cc3170b78f9d1ad88))
* **132-01:** config.toml [x402] 섹션 추가 (enabled, request_timeout) ([9763da9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9763da96f04fa6f426d366a36c9bfe2124944271))
* **132-01:** matchDomain + evaluateX402Domain 도메인 정책 평가 구현 ([9252c8d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9252c8dd09110944c95a2a3f19f2fecfcc433ce6))
* **132-02:** x402 결제 금액 USD 환산 모듈 구현 (GREEN) ([cd24aca](https://github.com/minhoyoo-iotrust/WAIaaS/commit/cd24aca57b4a3ff1029cc06ea9e31f49e7c34c35))
* **132-03:** POST /v1/x402/fetch 라우트 + 오케스트레이션 구현 ([7a48e23](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7a48e23ef161e9e9c5010ab9f2b36ada5e87ce78))
* **132-03:** server.ts에 x402 라우트 등록 + sessionAuth 경로 매핑 ([b5f300a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b5f300a9b7211d4633128460e005407901f96448))
* **133-01:** Python SDK x402_fetch 모델 + 메서드 + 5개 테스트 ([17f757d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/17f757d44ec0b8d611b7517cf22e821dec99a5ce))
* **133-01:** TS SDK x402Fetch 타입 + 메서드 + 4개 테스트 ([52f1b3b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/52f1b3b089733c72b87d97f26a83d80caa424aa2))
* **133-02:** MCP x402_fetch 도구 + 6개 테스트 + server.ts 등록 ([53ed76d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/53ed76d4975d436d1ac470622175e227e0749e89))
* **133-02:** x402.skill.md + transactions.skill.md 갱신 + VALID_SKILLS/SKILL_NAMES 등록 (7개) ([8888fd8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8888fd8604bb25a0885a43595e8fa4ac4d926ebb))
* **134-01:** 4개 미등록 PolicyType Zod rules 스키마 추가 ([0fe0852](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0fe085238a7b2bffbff94fe469e989620e55d4e5))
* **134-01:** DynamicRowList + PolicyFormRouter + JSON 토글 + policies.tsx 리팩터링 ([b3b65be](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b3b65beb1a07482c0a0fa52a13d888b81d8ea544))
* **134-02:** 5개 타입 전용 폼 컴포넌트 + PolicyFormRouter 통합 + 유효성 검증 ([6f6dc5f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6f6dc5f061bc1b1658031cf61285421d9195eb51))
* **135-01:** 7개 타입 전용 폼 컴포넌트 + PolicyFormRouter 12-type 통합 ([f846423](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f846423239dfafd187d246c651322d407a01cd8f))
* **135-01:** validateRules 7개 타입 유효성 검증 추가 ([1195b51](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1195b51ab69496b37f3d660d060daa118e4aa635))
* **135-02:** PolicyRulesSummary 12-type 시각화 + 수정 모달 전용 폼 프리필/저장 통합 ([71ac3ff](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71ac3ff622be9821677ff3197905d8deb75ee890))
* **136-01:** DB v13 마이그레이션 + Drizzle 스키마 + SpendingLimitRulesSchema 확장 ([90e5adb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/90e5adb5a9414fa75cf2e1df27b183b30d3750ad))
* **136-01:** evaluateAndReserve USD 기록 + releaseReservation 확장 + v13 마이그레이션 테스트 ([edd1db7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/edd1db79819aa5d96eed3fba6a2b48232e5694db))
* **136-02:** evaluateAndReserve 누적 USD 집계 + APPROVAL 격상 + Stage 3 알림 + 테스트 ([acd5d7d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/acd5d7d1208babbb034c2804520dbe456fb2488e))
* **136-02:** PolicyEvaluation 확장 + CUMULATIVE_LIMIT_WARNING 이벤트 + approval-workflow USD 클리어 ([a9cce6c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a9cce6c96be1aa9aed6c56f940ada90d6e13057e))
* **137-01:** PolicyRulesSummary 누적 한도 시각화 + CSS 스타일 추가 ([04ce084](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04ce084ed2a0b1ff6fae303b0afd173b414fa2e3))
* **137-01:** SpendingLimitForm 누적 한도 입력 필드 + 검증 로직 추가 ([f5aabcc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f5aabccdb639a7a1cf38065e37d2daada6f15548))
* **137-02:** TS/Python SDK에 SpendingLimitRules 타입 추가 ([f9bcd70](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f9bcd702786cc354e47f9302c6ba69cdf465a781))
* **138-01:** formatDisplayCurrency 유틸리티 + GET /admin/forex/rates + 테스트 39개 ([932c8d0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/932c8d07c59820f18c83bc0a53e9abddab502c37))
* **138-01:** IForexRateService 인터페이스 + CoinGeckoForexProvider + ForexRateService + 43개 통화 메타데이터 ([fd19184](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd1918404fd3bdc9d1530a031cc5555342d30155))
* **138-02:** Admin Settings 통화 드롭다운 (CurrencySelect) + Display 섹션 + CSS ([a84a0d7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a84a0d71a41d885ad708278994c7c93ad201e117))
* **138-02:** config.toml display 섹션 + SettingsService display 카테고리 + ForexRateService daemon 통합 ([1a8a777](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1a8a7773eaab549447597d6c459ade72c737ac87))
* **139-01:** Admin UI 환산 표시 유틸리티 + 대시보드 amountUsd 통합 ([fd6433c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fd6433c105a5864b90cedc54fc9a1c51fe7e26d9))
* **139-01:** 알림 메시지에 display_amount 환산 금액 통합 ([358f8f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/358f8f6d1aef74275cb0f213f07fe07c96a95651))
* **139-02:** MCP 도구 display_currency 파라미터 + 스킬 파일 동기화 ([272a84f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/272a84f52577667da1b46504e5aa55dcdc5ecbd0))
* **139-02:** REST API 4개 엔드포인트에 display_currency 쿼리 파라미터 + 환산 필드 추가 ([621c26f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/621c26f281b478e23750f5ee2aaa0d5b09af82fa))
* **140-01:** EventBus 인프라 + 이벤트 타입 정의 ([d666c46](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d666c46c708d7df746be9b8d57d2c581fd746825))
* **140-01:** 파이프라인 + 라우트에서 EventBus 이벤트 동시 발행 ([fe11fba](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fe11fbaa4fdb2b3971e4598ab7378f621a1b93b4))
* **140-02:** DB v14 마이그레이션 + kill_switch_state 값 변환 ([11467f6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/11467f64ca464fbb95304354dfefcaffd0bb0297))
* **140-02:** KillSwitchService 3-state 상태 머신 + CAS ACID 패턴 ([ba86248](https://github.com/minhoyoo-iotrust/WAIaaS/commit/ba86248ae99ebedddf282b7ef4fce7de1748aaff))
* **140-03:** Kill Switch 6-step cascade + killSwitch 미들웨어 3-state 리팩토링 ([d014554](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d0145541051fd5d2d141e11883aab2916cd0edd4))
* **140-03:** Kill Switch REST API + dual-auth 복구 + DaemonLifecycle 통합 ([6c1348c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6c1348ce22648dcdfbd223572ac28aea4b2881da))
* **141-01:** AutoStopService 4 규칙 엔진 + EventBus 구독 구현 ([19d3e96](https://github.com/minhoyoo-iotrust/WAIaaS/commit/19d3e965760a4c4f1a55d6fd9b708eca8480b78b))
* **141-02:** AutoStop config.toml 6개 키 + Admin Settings autostop 카테고리 + i18n 범용 템플릿 ([7f3fc81](https://github.com/minhoyoo-iotrust/WAIaaS/commit/7f3fc81d85049eea426778dc853d395ff01fa2b7))
* **141-02:** DaemonLifecycle AutoStop 통합 + hot-reload + 16개 통합 테스트 ([414d601](https://github.com/minhoyoo-iotrust/WAIaaS/commit/414d6016d1c81e74d7db4ba826a0012b133c3a49))
* **142-01:** BalanceMonitorService 코어 구현 + 15개 단위 테스트 ([62d1537](https://github.com/minhoyoo-iotrust/WAIaaS/commit/62d15377756f1001623f8ae154855ee571080ab1))
* **142-01:** LOW_BALANCE NotificationEventType + i18n 템플릿 추가 ([1bc0bc8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1bc0bc8834fe19e66d4f7c1f2fbb748138ca67ac))
* **142-02:** config.toml monitoring flat key + Admin Settings + HotReload 통합 ([fddad2d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/fddad2d996af3669482a4469b565d4c7f4a678df))
* **142-02:** DaemonLifecycle 통합 + 통합 테스트 14개 ([c390646](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c39064672f7fb5669788f36a20e2bc409ed658bd))
* **143-01:** DB 마이그레이션 v15 + Drizzle 스키마 + config/settings 확장 ([215bdd8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/215bdd824604f332e61434ba3e3e85b794175b00))
* **143-01:** TelegramBotService Long Polling + /start, /help, /status + DaemonLifecycle + i18n ([430205a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/430205a8d02057f57d286ebc219469622d033e1b))
* **143-02:** 2-Tier 인증 + /wallets, /pending, /approve, /reject 명령어 ([f601b04](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f601b040f219abfd82605273dd5f56995ea00ad2))
* **143-02:** Admin REST API -- telegram_users 관리 엔드포인트 3개 ([173432e](https://github.com/minhoyoo-iotrust/WAIaaS/commit/173432e38a9e1fd7991e01fb263437a552e5d948))
* **143-03:** 인라인 키보드 빌더 + /killswitch 확인 대화 + /newsession 월렛 선택 ([9cf709d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9cf709d93b44635b3b7ddc527a71e8dec67094b5))
* **144-01:** Kill Switch 3-state UI 리팩토링 + API 엔드포인트 추가 ([e974d2a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e974d2a5408d49778c453e10a348fd9ad2673c72))
* **144-01:** Telegram Users 관리 페이지 + 사이드바 라우트 추가 ([f10dd49](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f10dd495e9ff37b2a41d630c55cffd171b8887f4))
* **144-02:** AutoStop + Balance Monitoring Settings 섹션 추가 ([5600f9c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/5600f9cb78436d944d14f2a8b64692f0a2fedc35))
* **145-01:** entrypoint.sh + docker-compose.yml 생성 ([91a050a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/91a050aa11c347257c94c872a6f292380847cca7))
* **145-01:** Multi-stage Dockerfile + .dockerignore 생성 ([d40cce0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d40cce0e5ee07ae9ab36c76879773e29d6fcf935))
* **145-02:** Docker Secrets 오버라이드 compose 파일 + 보안 설정 ([23b2b31](https://github.com/minhoyoo-iotrust/WAIaaS/commit/23b2b31abf55b4fe02dd146a9d54436f7640d278))
* **146-01:** DaemonLifecycle WC 통합 (Step 4c-6 초기화 + shutdown 해제) ([112c4da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/112c4da7bfe88562e839df905d2fed53dc9ed6f4))
* **146-01:** WC 인프라 - SqliteKeyValueStorage + WcSessionService + DB v16 마이그레이션 ([676454b](https://github.com/minhoyoo-iotrust/WAIaaS/commit/676454b9ee7c9063c8251c3daec3a92df9a6cdb1))
* **146-02:** hot-reload에 walletconnect 키 변경 감지 추가 ([6513dda](https://github.com/minhoyoo-iotrust/WAIaaS/commit/6513dda728411d2dc063996e1e0afbcf3c85e31c))
* **147-01:** WC REST API 4개 엔드포인트 + OpenAPI 스키마 + 18개 단위 테스트 ([1cb8d60](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1cb8d60721f3e15c36a62340bdc4a4261d73b19f))
* **147-01:** WcSessionService 페어링/세션 관리 메서드 + CAIP-2 상수 + 에러 코드 ([54563b4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/54563b4e5e0fa7927c3ef29af61d7855712cb204))
* **147-02:** Admin UI WalletConnect QR 모달 + 세션 관리 섹션 ([7667967](https://github.com/minhoyoo-iotrust/WAIaaS/commit/76679678c65b6c2286003ed42fdae3b1b0932132))
* **147-02:** CLI owner connect/disconnect/status 명령어 + qrcode 터미널 출력 ([bc5f9e0](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bc5f9e0f4b848821d27dbc2d6122700e98132595))
* **148-01:** stage4Wait WC 연동 + 전체 DI 배선 ([a1eb63f](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a1eb63f22bf7d5f25155f85748bc2d5f1d55af6e))
* **148-01:** WcSigningBridge 서비스 생성 ([9edaa57](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9edaa576436af80220cb85ab1c687b9044dbe6ec))
* **149-01:** EventBus 이벤트 + 알림 타입 + i18n 템플릿 추가 ([e0e51c2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/e0e51c2cfcc2b357242d34d746368792ada8fe5a))
* **149-01:** WcSigningBridge Telegram fallback + approval_channel 추적 + DI 배선 ([aaadc33](https://github.com/minhoyoo-iotrust/WAIaaS/commit/aaadc33eab07ce237837510a850a5ae0fae3a731))
* **150-01:** Admin UI WalletConnect 전용 관리 페이지 ([9381b42](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9381b42654f0b37435073b724df8d1178838a178))
* **150-01:** session-scoped WC REST endpoints (/v1/wallet/wc/*) ([3cb2ae1](https://github.com/minhoyoo-iotrust/WAIaaS/commit/3cb2ae1a29cb862e46819aba605b02c144917163))
* **150-02:** MCP ApiClient.delete() + 3 WC 도구 (wc_connect, wc_status, wc_disconnect) ([8887fbd](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8887fbdffeefc3f1fac70b7f9fd47578840d9f18))
* **150-02:** TS/Python SDK WC 메서드 + Skill 파일 WalletConnect 섹션 ([b0c698a](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0c698aa5ab8aa7e9f3f4bef4a1c73a8ce4efdff))
* **151-01:** Turborepo 5개 테스트 태스크 분리 + 패키지 스크립트 ([c01cc18](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c01cc18956e00e2829772022473dc7c4a40b8fcd))
* **151-02:** MockOnchainOracle + MockPriceOracle + MockActionProvider (M8-M10) + barrel export + 검증 테스트 ([bc27c0d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/bc27c0d7b50971efd439f1708c3bcbf387f5de31))
* **151-02:** msw 2.x 설치 + Jupiter/가격 API msw 핸들러 (M6, M7) ([46a01da](https://github.com/minhoyoo-iotrust/WAIaaS/commit/46a01da251671926eb7d00e56df3135c3198a981))
* **152-01:** Enum SSoT 빌드타임 검증 스크립트 + DB 일관성 테스트 ([452d406](https://github.com/minhoyoo-iotrust/WAIaaS/commit/452d406897d5de5e325cdf9992e77a74bee9ba91))
* **160-01:** BackgroundWorkers runImmediately + VersionCheckService 구현 ([8ad9759](https://github.com/minhoyoo-iotrust/WAIaaS/commit/8ad9759584731510a779ff8be6c588ffb2880654))
* **160-02:** GET /health에 latestVersion, updateAvailable, schemaVersion 필드 추가 ([57352eb](https://github.com/minhoyoo-iotrust/WAIaaS/commit/57352ebaf9387cc92f585c04aa248c6fb3bc97f1))
* **161-01:** CLI 업그레이드 알림 모듈 구현 ([b03eba2](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b03eba24299e4d0259559c6370a34c52764f8df2))
* **161-02:** BackupService 구현 + barrel export ([b0b011c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/b0b011ce33513f212ed2da98a10cb697391adcd2))
* **161-03:** upgrade 명령 구현 + CLI 등록 ([68bccd7](https://github.com/minhoyoo-iotrust/WAIaaS/commit/68bccd7b2c4ce184561adcbae469c53631747f96))
* **162-01:** checkSchemaCompatibility 함수 + 호환성 매트릭스 테스트 ([f8a55d6](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f8a55d626f0d13e2efa8442822c6b30994192454))
* **162-01:** daemon Step 2 호환성 검사 통합 + SCHEMA_INCOMPATIBLE 에러 코드 ([f638eb4](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f638eb4e8d44bbedc668105a462db4ddf49a5d4d))
* **162-02:** Dockerfile에 Watchtower + OCI 표준 라벨 추가 ([64d3c1d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/64d3c1dfc5f88b30b147be1423d328bd743a845a))
* **162-02:** release.yml에 docker-publish job 추가 (GHCR 3-tier 태깅) ([a60db52](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a60db524ca35939a2fc093b56fabaaf840fbada3))
* **163-01:** release-please 설정 파일 3종 생성 ([115e4f9](https://github.com/minhoyoo-iotrust/WAIaaS/commit/115e4f916f947bdc1df6ec2d6a58a1de59e9040e))
* **163-02:** release.yml에 deploy job 추가 (게이트 2) ([f639e61](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f639e614dd89f6c2292202f63ee212ebb1b27475))
* **164-01:** SDK HealthResponse 타입 추가 + 스킬 파일 /health 응답 동기화 ([c6ab810](https://github.com/minhoyoo-iotrust/WAIaaS/commit/c6ab810e2d2e3abaf800467f1a00157ff3dd450d))
* v1.7 품질 강화 + CI/CD ([1ad8328](https://github.com/minhoyoo-iotrust/WAIaaS/commit/1ad8328176f4bf65b5eb398114b3b290f98635e6))
* 마일스톤 감사/완료 전 빌드+테스트 자동 실행 훅 추가 ([#039](https://github.com/minhoyoo-iotrust/WAIaaS/issues/039)) ([45bb693](https://github.com/minhoyoo-iotrust/WAIaaS/commit/45bb693357bc7fe37ab164a64442d4d32a05d880))


### Bug Fixes

* [#042](https://github.com/minhoyoo-iotrust/WAIaaS/issues/042) tsconfig.build.json 도입으로 빌드/테스트 분리 + [#049](https://github.com/minhoyoo-iotrust/WAIaaS/issues/049) SignClient ESM/CJS interop ([0a45e67](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0a45e6722f42b4dc0982e933a348c29a24064872))
* [#043](https://github.com/minhoyoo-iotrust/WAIaaS/issues/043) WalletConnect 미설정 시 404 대신 503 반환 + 에러 메시지 매핑 ([9c62171](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9c62171f05b0930a03c45445755fb75f8b15c6af))
* [#047](https://github.com/minhoyoo-iotrust/WAIaaS/issues/047) Terminate 시 리소스 정리 + TERMINATED 가드 적용 ([d6e353d](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d6e353d444427c84dfcebf29700800fcefaf3b3b))
* **120-01:** reorder pushSchema to run indexes after migrations ([356e732](https://github.com/minhoyoo-iotrust/WAIaaS/commit/356e732adb482ac8a8cd384a68f7534e528174d6))
* **124-01:** apiPost 빈 body 버그 수정 + 채널별 테스트 UI ([a45022c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/a45022c121be328f2b5573eaa3aab5ca91450b44))
* **125:** revise plans based on checker feedback ([12b1854](https://github.com/minhoyoo-iotrust/WAIaaS/commit/12b1854c52b322ef476b28b1e7303f9d0df864e5))
* **admin:** Table 컴포넌트 undefined data 크래시 수정 + 테스트 카운트 갱신 ([#037](https://github.com/minhoyoo-iotrust/WAIaaS/issues/037), [#038](https://github.com/minhoyoo-iotrust/WAIaaS/issues/038)) ([f0ddcbc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/f0ddcbc5c80d2a28999216b089421b43aa7c8d7d))
* core 스냅샷 테스트 기대값 갱신 + ROADMAP Progress 테이블 수정 ([623d9dc](https://github.com/minhoyoo-iotrust/WAIaaS/commit/623d9dc4cc0841bac97c62ebe0d13dec025e7203))
* listActions() noUncheckedIndexedAccess 수정 + 목표 문서 정비 ([d5b7417](https://github.com/minhoyoo-iotrust/WAIaaS/commit/d5b7417bbfcd7d0c3e8654ac9d9f995b04d56e58))
* 오픈 이슈 5건 일괄 수정 ([#053](https://github.com/minhoyoo-iotrust/WAIaaS/issues/053)-[#057](https://github.com/minhoyoo-iotrust/WAIaaS/issues/057)) ([0c93e87](https://github.com/minhoyoo-iotrust/WAIaaS/commit/0c93e87e2304a7172c6ae601e488dc0d2342820d))
* 이슈 [#040](https://github.com/minhoyoo-iotrust/WAIaaS/issues/040)-[#052](https://github.com/minhoyoo-iotrust/WAIaaS/issues/052) 일괄 처리 + v1.8 objective 문서 수정 ([9ba7c2c](https://github.com/minhoyoo-iotrust/WAIaaS/commit/9ba7c2c8e9a8d7e50cd1b9cc1c01d33c132fbdae))
* 이슈 033~036 수정 + 로드맵 재편 (Desktop v2.6 이연) ([04ee9ab](https://github.com/minhoyoo-iotrust/WAIaaS/commit/04ee9ab6ba35042fb6bbfa57f371f4991075db48))


### Code Refactoring

* **120-01:** fix comment count for expected indexes in migration chain tests ([71423c8](https://github.com/minhoyoo-iotrust/WAIaaS/commit/71423c843c147a8b76d162a5c99e09232206c1f1))
