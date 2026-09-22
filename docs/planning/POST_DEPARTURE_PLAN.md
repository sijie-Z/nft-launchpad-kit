# 离职前后规划（2026-09-24 离职）

> 本文档回答三个问题：**临走前必须做什么**、**下一步做什么**、**不做什么**。
> 配合 `HANDOFF.md` 使用（那份是项目技术交接，这份是人生/节奏规划）。

---

## 🔴 第一优先级：账号访问权（离职前 2 天必做）

**这是最容易翻车的地方** —— 公司电脑一旦被收回/重装，某些东西会永久丢失。

### 1. npm 账号（最危险）⚠️

你的 npm 2FA 用的是**这台公司电脑的 Windows Hello 安全密钥**。电脑一还，这个密钥就没了。

**必做（今天/明天）**：
- [ ] 找到你注册时显示的 **10 个恢复码**（当时页面让复制/下载了）——如果没有保存，**现在立刻重新生成**：
  ```
  https://www.npmjs.com/settings/sijiez/tfa
  ```
  重新生成恢复码 → **存到你的个人手机/个人邮箱/密码管理器**（不要存在公司电脑上）
- [ ] 验证：用恢复码能否登录（可以事后在新电脑上试）

### 2. GitHub 账号

- [ ] 确认 GitHub 2FA 用的是**个人手机**的验证器（不是公司电脑/公司手机）
- [ ] 如果没有恢复码，同上去 https://github.com/settings/security 生成并保存

### 3. 密码管理器

- [ ] npm 密码、GitHub 密码 → 确保存在**个人**能访问的地方（手机/个人邮箱）

### 4. 公司资产（不要带走）

- [ ] `C:\Users\admin\.ssh\miqroforge_push` —— **公司的 SSH 密钥，留在机器上**
- [ ] 公司仓库（14790897/MiQi、MiqroForge-Desktop）的任何本地副本 —— 不要带走
- [ ] 公司电脑上的项目文件 —— 离职后按公司规定清理

---

## 📦 第二优先级：确认一切在云端（今天完成）

| 内容 | 位置 | 状态 |
|------|------|------|
| 全部代码 | https://github.com/sijie-Z/nft-launchpad-kit（你的个人账号） | ✅ |
| 规划/战略文档 | 本仓库  目录 | ✅ |
| Claude 记忆文件 | 私有仓库 `memory/` 目录 | ✅ |
| npm 包 | https://www.npmjs.com/package/@nft-launchpad-kit/sdk | ✅ |
| 部署钱包私钥 | GitHub Secrets（`PRIVATE_KEY`） | ✅ |
| 本地 ZIP 备份 | `D:\Desktop\nft-launchpad-kit\planning-docs-backup.zip` | ✅（可选） |

**结论：可以安全地删除公司电脑上的所有本地文件**（如果你需要）。

---

## 🚀 下一步做什么（离职后第 1 周）

### 唯一的前置动作（5 分钟）

给测试钱包领测试币 → 整个项目就从"代码完成"变成"链上真实可用"：

1. https://sepolia-faucet.pk910.de/ （免注册，浏览器挖矿）
2. 粘贴地址：`0xD2E2187aDe9275ce77305EB5f5d75e42C5AB01F0`
3. 挖到 0.5 ETH → Claim

### 然后（按顺序）

| 步骤 | 做什么 | 用时 |
|------|--------|------|
| 1 | 新电脑上恢复环境：装 Node 20 + git + Claude Code，从 `docs/planning/memory/` 恢复记忆，clone 代码 | 半天 |
| 2 | 新电脑上 `npm login`（用恢复码或重新配 2FA）→ 确认 npm 发布权限 | 30 分钟 |
| 3 | 领测试币 → 触发部署（`gh workflow run deploy.yml -f network=sepolia`）→ 链上真实可用 | 1 小时 |
| 4 | **池 A 验证**：找 3-5 个 agent 开发者测 SDK（协议在 `docs/pool-a-test-protocol.md`） | 1-2 周 |
| 5 | **池 B 验证**：找 2-3 个真实项目免费发行（物料在 `docs/pool-b-materials.md`） | 并行 |

**第 4、5 步是真正的分水岭** —— 技术已经做完了，现在验证的是"有没有人要用"。

---

## ⏭️ 下下步做什么（按数据决定，不预先承诺）

**前提：池 A/B 数据回来了。**

| 如果数据是…… | 那就做…… |
|--------------|----------|
| 开发者能 10 分钟内完成发行（≥2 人） | 扩展 SDK + 发布到更多渠道（开发者生态路线） |
| 项目方愿意用（≥2 个完成 + ≥1 个再发） | 设计收费模式（托管/白标）+ 找第一个付费客户 |
| 有人问"发行后能在哪交易"（≥2 个独立用户被此阻塞） | 集成 Seaport（挂单自动上 OpenSea），**不自建市场** |
| 没人愿意用 | **停下来**，回战略层重新想定位 —— 不要加功能掩盖 |

---

## 🚫 明确不做什么（避免分心清单）

1. **不加新功能** —— 在有人用之前，任何新功能都是自我安慰
2. **不自建 NFT 市场** —— 除非用户亲口说被交易阻塞，且届时优先集成 Seaport
3. **不做大而全 SDK** —— 第一版只需要 create/issue/mint/query 五个方法
4. **不在公司电脑上做任何私人项目的收尾工作之外的部署/常驻服务**（你的原则：不装定时任务）
5. **不追新赛道** —— 先把这一件事做完再开新的（虽然 AI 方向很诱人，但半成品没有价值）
6. **不在主网上线** —— 合约审计是硬门槛，测试网验证阶段不需要花钱审计

---

## 🎯 一句话总结

> **技术已经做完了。离职后唯一要做的事：让 3-5 个真实的人用一次，然后看数据说话。**

- **离职前**：保存 npm/GitHub 恢复码（最重要）→ 确认云端备份（已完成）
- **离职后第 1 周**：领测试币 → 部署 → 找第一批用户
- **第 2-4 周**：按数据决定下一步，或者诚实地停下来

---

## 附录：恢复环境速查

```bash
# 新电脑上从零恢复
# 1. 装：Node 20 / git / Claude Code / MetaMask
# 2. 恢复记忆：从私有仓库下载 memory/ 到 ~/.claude/projects/<项目路径>/memory/
# 3. 拉代码
git clone https://github.com/sijie-Z/nft-launchpad-kit.git
cd nft-launchpad-kit/scaffold-alchemy-main && yarn install
# 4. 验证
yarn hardhat:test                                    # 应 100 通过
yarn workspace @nft-launchpad-kit/sdk test           # 应 8 通过
# 5. 给 Claude 的第一句话：
#    "继续 NFT Launchpad Kit 的 Phase 1。先读私有仓库
#     docs/planning/HANDOFF.md 和 POST_DEPARTURE_PLAN.md 恢复上下文，
#     然后告诉我下一步。"
```
