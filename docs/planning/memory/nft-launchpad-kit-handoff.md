---
name: nft-launchpad-kit-handoff
description: "Where the project stands (2026-09-02) — everything saved to GitHub, only testnet faucet + pool A/B validation remain"
metadata: 
  node_type: memory
  type: project
  originSessionId: 144eefe9-94f8-409c-965e-b91ce24c09e7
  modified: 2026-09-22T07:30:17.383Z
---

NFT Launchpad Kit 项目状态（2026-09-02 保存点，用户因工作繁忙暂停）：

**两个仓库**：
- 代码（公开）：https://github.com/sijie-Z/nft-launchpad-kit（main = 发布，develop = 开发）
- 规划文档（私有）：https://github.com/sijie-Z/nft-launchpad-kit-planning（HANDOFF.md 是恢复入口）

**已完成**：v1.0.0 发布 · SDK 上线 npm（`@nft-launchpad-kit/sdk` 0.1.2，ESM+CJS）· 204+ 测试全绿 · CI 三 Job（合约/前端/子图）· 池 A/B 测试协议已写 · 部署流水线就绪

**卡点（恢复后第一步）**：给测试钱包 `0xD2E2187aDe9275ce77305EB5f5d75e42C5AB01F0` 领 Sepolia 测试币（https://sepolia-faucet.pk910.de/ 免注册）→ 告知 Claude 触发 `gh workflow run deploy.yml -f network=sepolia`。私钥已在 GitHub Secrets（`PRIVATE_KEY`），本地无任何密钥残留。

**之后**：池 A（3-5 agent 开发者测 SDK，protocol 在 docs/pool-a-test-protocol.md）+ 池 B（2-3 真实项目免费发行）→ 停止条件判定 → Phase 2。

**用户环境**：公司电脑，本地文件可随时删除（所有内容已在 GitHub）；npm 账号 sijiez，2FA 用 Windows Hello 安全密钥。

相关：[[phase1-plan-approved]]、[[nft-launchpad-ai-native-direction]]
