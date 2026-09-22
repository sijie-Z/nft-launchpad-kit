# NFT Launchpad Kit — 开发计划 v1

> 用途：开发路线图，基于 2026-08-28 对现有代码的全面盘点 + 问题审计。
> 工作方式：**一个 issue → 一个 PR → 快速 CI（3–5 分钟）**。
> 文档更新日期：2026-08-28

---

## 0. 一句话总结

本地是毛坯（只有 3 个文档），但 **GitHub 仓库 `sijie-Z/nft-launchpad-kit` 里有 v34 的完整旧代码**（合约 + 前端 + 子图 + 170 个测试）。本项目不重写，**基于现有代码继续**：先做安全清理和快速 CI，再逐个验证/修复合约与前端，最后完成部署与发布。全程 issue/PR 工作流。

---

## 1. 现状盘点（2026-08-28 调查结果）

### 1.1 代码在哪里

| 位置 | 内容 | 状态 |
|------|------|------|
| `D:\Desktop\nft-launchpad-kit\nft-launchpad-kit\`（本地） | 只有 `PROJECT.md` / `README.md` / `.gitignore` | 毛坯，无 git |
| GitHub `sijie-Z/nft-launchpad-kit`（远程 main） | 完整代码，`scaffold-alchemy-main/` 工作区 | 7 个提交，**CI 从未运行过** |
| `D:\Desktop\nft-launchpad-kit\code\`（本次调查克隆） | 远程仓库的工作副本，后续开发都在这做 | 新建 |

### 1.2 代码构成（已验证存在）

| 模块 | 位置 | 规模 |
|------|------|------|
| 智能合约 | `packages/hardhat/contracts/` | `NFTLaunchpadKit.sol`（1218 行，33+ 自定义错误）+ `Factory.sol` + `TestERC20.sol` |
| 合约测试 | `packages/hardhat/test/` | 5 个文件 ~2100 行（advanced / audit / claimConditions / load / Factory） |
| 前端 | `packages/nextjs/` | Next.js 14 + viem/wagmi + Prisma(SQLite)，10 个 API 路由 + 5 个页面 + 24 组件 |
| 前端测试 | `packages/nextjs/__tests__/` | 10 个 Vitest 文件（74 用例，API 测试全部 mock prisma，**不需要数据库**） |
| 子图 | `packages/subgraph/` | The Graph：schema + mappings，独立 npm 包（不进 yarn workspaces） |
| CI | `.github/workflows/` | 3 个文件（test / lint / deploy），**零次运行记录** |
| 部署地址 | `packages/nextjs/contracts/deployedContracts.ts` | Sepolia 真实地址 `0x7597D0…` / `0x1e3200…` 已写入 |

### 1.3 本次调查的关键发现

1. **CI 配置存在但从未真正跑过**（Actions 运行记录为空），且设计有明显缺陷 —— 见第 4 章。
2. **仓库里提交了疑似真实的 Alchemy API Key** —— 见 2.1 节，需要立刻处理。
3. **文档与代码不一致**：README 说"82 个测试"（实际 96+）、PROJECT.md 说合约"~900 行"（实际 1218 行）、PROJECT.md 声称的某些"已完成"项在代码里需逐一核实。
4. **构建错误被主动吞掉**：`next.config.js` 里 `NEXT_PUBLIC_IGNORE_BUILD_ERROR=true` 会跳过 TS/ESLint 检查，旧 CI 还专门把它设成 true —— 等于 CI 里根本没做类型检查。
5. 本地环境：git 2.54 / node 22 / gh CLI 已登录（sijie-Z），可以直接驱动整个 GitHub 流程。

---

## 2. 问题清单（"有问题的地方"）

> 分类：🔴 必须处理（安全/阻塞）→ 🟡 建议处理（质量/一致性）→ 🟢 可选（锦上添花）

### 2.1 🔴 必须处理

| # | 问题 | 位置 | 处理方式 |
|---|------|------|----------|
| P1 | **硬编码 Alchemy API Key 提交进仓库**（`ALCHEMY_API_KEY` + `ALCHEMY_GAS_POLICY_ID`，构建时注入前端产物） | `packages/nextjs/config/defaultKeys.json` + `next.config.js` | 移除文件中的真实密钥，改为从环境变量读取；**建议你去 Alchemy 后台轮换这组 key**（已公开在 GitHub，等于泄露） |
| P2 | **CI 形同虚设**：3 个 workflow 从没跑通过、lint 失败被 `continue-on-error` 吞掉、构建错误被 `IGNORE_BUILD_ERROR` 吞掉 | `.github/workflows/*.yaml`、`next.config.js` | 重写为第 4 章的快速 CI；禁止吞错误 |
| P3 | **git 历史与代码卫生**：根目录 `package-lock.json`（997KB，npm）与 `yarn.lock`（yarn 3）并存，双锁文件互相矛盾 | 根目录 | 删除 `package-lock.json`（项目用 yarn 3），统一 `yarn.lock` |
| P4 | **环境变量文档缺失**：`env.ts` 要求 `DATABASE_URL`（必需），但 `.env.example` 里没有这一项，照抄模板的人启动必报错 | `.env.example` / `lib/env.ts` | 对齐 `.env.example` 与实际校验清单 |

### 2.2 🟡 建议处理

| # | 问题 | 位置 | 处理方式 |
|---|------|------|----------|
| P5 | 文档数字与现实不符（82 vs 96+ 测试、900 vs 1218 行、部分"已完成"存疑） | `README.md` / `PROJECT.md` | 以代码为准做一次文档校正（M3 里程碑） |
| P6 | `debug` 路由代码仍在（PROJECT.md 说已从导航移除，但 `app/debug/` 全套组件都在） | `packages/nextjs/app/debug/`（~16 个文件） | 决策点 D2：保留（对合约调试有用）还是剔除（减少维护面） |
| P7 | `subgraph` 是独立 npm 包（有自己的 package-lock），不在 yarn workspaces 内，也没进 CI | `packages/subgraph/` | 决策点 D3：保留但单独管（子图构建重、不进主 CI），或先冻结 |
| P8 | 前端依赖有"疑似未用"的（`@uniswap/*`、`qrcode.react`、`react-copy-to-clipboard`、`next-auth`、`burner-connector` 等，需逐个核实） | `packages/nextjs/package.json` | 用 `knip`/手工核对后剔除未用依赖（减轻安装体积、加快 CI） |
| P9 | `.env.example` 里的 `ALCHEMY_GAS_POLICY_ID` 指向已泄露的 key | 同上 P1 | 一并清空 |
| P10 | 旧 CI 里有 scaffold 模板残留（`lint.yaml` 里 `yarn chain & yarn deploy` 起硬分叉节点等） | `.github/workflows/lint.yaml` | 直接删除/重写 |
| P11 | 合约测试的 Gas 报告只在本地有意义，CI 没留记录，无法回归对比 | `hardhat.config.ts` | CI 里关掉 `REPORT_GAS`（提速），本地保留 |

### 2.3 🟢 可选

| # | 问题 | 说明 |
|---|------|------|
| P12 | 移动端真机/浏览器测试 | 建议作为手动清单，不进 CI（会拉长 CI 时长，违背 3–5 分钟目标） |
| P13 | Etherscan 合约验证 | 脚本已存在，需要你提供 `ETHERSCAN_API_KEY` 后执行一次 |
| P14 | 多签钱包（Gnosis Safe） | PROJECT.md 7.6 节已有方案，属上线后增强，本期不做 |
| P15 | 第三方安全审计 | 上线主网前必须做，本期只做静态分析 + 人工审查 |

---

## 3. 目标架构

**保持不变**（旧代码已验证可行，重写无意义）：

- 合约：Solidity 0.8.28 + ERC721A + OpenZeppelin 5 + Hardhat（6 种铸造模式 + Factory Clone）
- 前端：Next.js 14 (App Router) + viem/wagmi + Tailwind + DaisyUI
- 后端：Next.js API Routes + Prisma 5 + SQLite
- 子图：The Graph（独立管理）
- 部署：Sepolia 测试网（main 目标不变）

**变更**（本轮要做的）：

- 密钥全部移出仓库 → 环境变量 + GitHub Secrets
- CI 从"没跑过"变成"每次 PR 3–5 分钟全绿"
- 测试成为硬性门槛：合约 96+ 测试、前端 74 测试、`tsc --noEmit` 零错误
- 构建错误/类型错误不再被任何开关掩盖

---

## 4. CI 设计（重点：3–5 分钟）

### 4.1 为什么旧 CI 会"跑半天"（如果跑起来的话）

1. **三个 workflow 各自完整安装依赖**：`test.yaml` 的 test job、build-frontend job、lint job 各跑一遍 `yarn install`（无任何缓存，`setup-node` 没配 `cache: yarn`）。这个 monorepo 装一次就要 2–4 分钟。
2. **串行执行**：`build-frontend` 依赖 `test`，等合约测试跑完才开始装前端依赖。
3. **build-frontend 跑 `next build`**（最重的一步，含 typecheck + 全量编译），却被 `NEXT_PUBLIC_IGNORE_BUILD_ERROR=true` 变成"白跑"。
4. **lint 失败被 `continue-on-error: true` 吞掉** → 红也是绿。
5. `lint.yaml` 里还跑 `yarn chain & yarn deploy`（起本地链 + 部署），又慢又脆。

结论：重写，而不是修补。

### 4.2 新 CI 设计

**文件：`.github/workflows/ci.yml`**（替代 test.yaml + lint.yaml）

```
触发：pull_request → main；push → main

Job A: contracts（合约测试）         Job B: frontend（前端校验）
  setup-node (node 20, cache: yarn)    setup-node (node 20, cache: yarn)
  corepack enable                      corepack enable
  yarn install --immutable (有缓存)     yarn install --immutable (有缓存)
  hardhat compile                       tsc --noEmit            ← 类型零错误
  hardhat test（不含 gas 报告）         vitest run              ← 74 用例
  eslint（hardhat 部分，失败即红）      next lint               ← 失败即红
A、B 并行，各自独立，互不等待
```

**预估时长**（ubuntu-latest，依赖缓存命中后）：

| 步骤 | Job A（合约） | Job B（前端） |
|------|---------------|---------------|
| 依赖安装（缓存后） | ~60–90s | ~60–90s |
| 编译/类型检查 | ~20s | ~60s |
| 测试 | ~60–120s | ~60s |
| lint | ~20s | ~30s |
| **合计** | **约 2.5–3.5 分钟** | **约 3–4 分钟** |
| **并行总时长** | — | **约 4 分钟** |

**设计原则**：
- 两个 Job 并行 → 总时长 = 慢的那个，不是两个之和。
- 依赖缓存用 `actions/setup-node@v4` 的 `cache: yarn`（yarn 3 的全局缓存命中后安装降到 1 分钟级）。
- **PR 阶段不跑 `next build`**（5–10 分钟，收益低）。类型安全由 `tsc --noEmit` 保证。
- 不设任何"忽略错误"开关；lint、类型、测试任何一项红 = CI 红。
- 合约测试关掉 `REPORT_GAS`（只在本地跑 gas 报告），测试再快一点。

**构建 + 部署（独立 workflow）**：

- `build.yml`：只在 **push 到 main 后**跑一次 `next build`（真构建，不再吞错误），通过后在 PR 的合并状态里能看到。
- `deploy.yml`：保留 `workflow_dispatch` 手动触发（Sepolia），环境变量走 GitHub Secrets（PRIVATE_KEY / ALCHEMY_API_KEY / ETHERSCAN_API_KEY），不再需要本地 .env。

### 4.3 为什么不把子图放进主 CI

`graph build` 需要下载 graph-cli 和 wasm 运行时（数百 MB、耗时 5 分钟+），违背 3–5 分钟目标。子图单独一个 workflow（`subgraph.yml`，手动触发），只在改子图时跑。

---

## 5. 实施路线图（一个 issue → 一个 PR）

> 约定：每个 issue 有编号、验收标准；实现按 issue 顺序进行；CI 必须在 PR 上绿了才能合并。

### 里程碑 M0 — 仓库基建与快速 CI（第 1–5 周的第一批工作，实际 1–3 天）

| Issue | 标题 | 改动范围 | 验收标准 |
|-------|------|----------|----------|
| **#1** | 安全清理：移除提交进仓库的 Alchemy 密钥 | `packages/nextjs/config/defaultKeys.json`、`next.config.js`、`.env.example` | 仓库内 grep 不到任何真实 key；本地 `yarn dev` 启动不再注入默认 key（改为空值 + 明确报错提示） |
| **#2** | 仓库卫生：删除 npm 锁文件，统一 yarn 3 | 根目录 `package-lock.json` 删除；`yarn.lock` 保持唯一 | `yarn install --immutable` 本地通过；`git grep "package-lock"` 无残留 |
| **#3** | 重写 CI：合约测试 Job（ci.yml Job A） | `.github/workflows/ci.yml` | PR 打开后 CI 自动跑；Job A **≤3 分钟**全绿（96 个测试） |
| **#4** | 重写 CI：前端校验 Job（ci.yml Job B）+ 删除旧 workflow | `ci.yml` Job B；删除 `test.yaml`/`lint.yaml` | 与 Job A 并行，**总 CI ≤5 分钟**全绿（tsc 0 error + 74 vitest + lint 0 warning） |
| **#5** | 真实构建与部署流水线 | `build.yml`（push main 后 next build）、`deploy.yml`（手动触发 + Secrets） | main 合并后 build 真跑且绿；deploy 可手动触发（无 Secrets 时 graceful 报错） |
| **#6** | 项目规范：issue/PR 模板 + CONTRIBUTING 更新 | `.github/ISSUE_TEMPLATE/`、`.github/PULL_REQUEST_TEMPLATE.md`、`CONTRIBUTING.md` | 新 issue/PR 自动带模板；PR 模板含"关联 issue"字段 |

### 里程碑 M1 — 合约基线（核心资产，重点验证）

| Issue | 标题 | 改动范围 | 验收标准 |
|-------|------|----------|----------|
| **#7** | 合约测试基线：96 个测试全绿并记录 | `packages/hardhat/test/` | 本地 + CI 全绿；测试数核实并写进 README（不再写 82） |
| **#8** | 合约静态安全审查（Slither + 人工清单）并修复发现 | `NFTLaunchpadKit.sol`、`NFTLaunchpadKitFactory.sol` | Slither 输出归档到 issue；发现问题全部修复并有回归测试；无修复项也要给出结论 |
| **#9** | 合约死代码与冗余剔除 | 合约内未用角色/错误/分支 | `FINANCE_ROLE` 等未用项清理；编译产物大小下降有记录；测试保持全绿 |
| **#10** | 合约 Gas 回归基准 | `hardhat.config.ts`、CI artifact | 本地 gas 报告存为基准文件；改动合约的 PR 可以对比（不强制） |

### 里程碑 M2 — 前端基线

| Issue | 标题 | 改动范围 | 验收标准 |
|-------|------|----------|----------|
| **#11** | 前端测试基线：74 个 Vitest 用例全绿 | `packages/nextjs/__tests__/` | 本地 + CI 全绿；确认 API 测试 mock 方式（不需要真实 DB） |
| **#12** | 前端类型与构建修复：`tsc --noEmit` 零错误、`next build` 真实通过 | 全前端 TS 文件、`next.config.js` | 本地 `tsc --noEmit` 0 error；`next build` 不设 IGNORE 开关也能通过 |
| **#13** | 前端依赖瘦身：剔除未用依赖 | `packages/nextjs/package.json` | knip 扫描 0 未用；`yarn install` 体积下降有记录；测试/构建保持绿 |
| **#14** | 前端死代码与遗留路由处理（debug 路由去留按决策 D2） | `app/debug/` 等 | 决策落地；导航/路由与文档一致 |

### 里程碑 M3 — 部署与发布

| Issue | 标题 | 改动范围 | 验收标准 |
|-------|------|----------|----------|
| **#15** | Sepolia 部署验证 + Etherscan 合约验证 | `deploy.yml`、`verify:sepolia` 脚本 | 手动触发部署成功；合约在 Etherscan 上验证通过（需要你提供 API key） |
| **#16** | 文档与代码同步 | `README.md`、`PROJECT.md`、`.env.example` | 文档中的测试数/行数/功能清单与代码一致；PROJECT.md 精简掉过时内容 |
| **#17** | v1.0.0 发布 | git tag + release | tag `v1.0.0` + release notes（自动生成） |

> 共 **17 个 issue**。每个 issue 独立成 PR，CI 绿才合并。M0 做完后，项目就有"每次提交 5 分钟内自动验证"的能力，之后所有改动都走这条流水线。

---

## 6. 开发流程约定

**分支**：`feat/<issue号>-<英文短描述>`，例如 `feat/3-ci-contract-job`

**提交信息**：Conventional Commits
```
feat: 重写 CI 合约测试 Job（#3）
fix: 移除仓库内硬编码 Alchemy 密钥（#1）
docs: 更新 README 测试数量（#16）
```

**PR**：
- 标题：`[#issue号] 一句话描述`（如 `[#3] CI: 合约测试 Job`）
- 描述：自动关联 issue（`Closes #3`），附 CI 截图/结果摘要
- 合并策略：squash merge，保持 main 历史干净

**Issue 模板**：feature 模板（背景/目标/验收标准）与 bug 模板（现象/复现/期望）

**CI 门槛**：CI 绿（合约测试 + 前端 tsc/vitest/lint）是合并的硬性条件，用 GitHub 分支保护规则强制。

**本地跑什么**（开发时）：
```bash
# 合约
cd code/scaffold-alchemy-main
yarn install --immutable
yarn hardhat:test          # 96 个合约测试
# 前端
yarn workspace @scaffold-alchemy/nextjs check-types
yarn workspace @scaffold-alchemy/nextjs test
yarn workspace @scaffold-alchemy/nextjs lint
```

---

## 7. 需要你决定的事项

| # | 决策点 | 我的建议 | 影响 |
|---|--------|----------|------|
| D1 | **Alchemy API Key**：`defaultKeys.json` 里的 key 是否是你的真实 key？ | 是的话请去 Alchemy 后台**轮换**（已公开）；无论是否真实，一律移出仓库 | 阻塞 #1 |
| D2 | **debug 路由**去留 | 保留（对合约调试有用），但维持"不进导航"现状 | 影响 #14 |
| D3 | **subgraph** 保留还是冻结 | 保留代码、独立 workflow 手动触发，不进主 CI | 影响 #6/CI 设计 |
| D4 | **依赖瘦身**是否执行（#13，会动 package.json） | 执行，但仅剔除确认未用的，不升级版本 | 影响 #13 |
| D5 | **移动端真机测试** | 本期不做进 CI（保持 3–5 分钟目标），做成手动清单 | 影响 P12 |
| D6 | **Etherscan 验证**：是否提供 API key 让我完成 #15 | 能提供就做，不能就先跳过（不阻塞其他） | 影响 #15 |

> 除 D1 必须由你处理外，其余若你不表态，我就按"我的建议"执行，并在对应 PR 里说明。

---

## 8. 附录：参考项目（从 GitHub 学习）

| 项目 | 地址 | 借鉴点 |
|------|------|--------|
| scaffold-eth-2 | github.com/scaffold-eth/scaffold-eth-2 | 本项目前端 hook 模式的源头，其 CI 设计（缓存 + 并行）可参考 |
| thirdweb Contracts | github.com/thirdweb-dev/contracts | ClaimCondition 多阶段售卖、SignatureMint 模式 |
| ERC721A | github.com/chiru-labs/ERC721A | 批量铸造 gas 优化（本项目已用） |
| Sound Protocol | github.com/soundxyz/protocol | Factory 部署 + Minter 分离架构 |
| Manifold Creator | github.com/manifoldxyz/creator-core-contracts | 扩展/插件架构（P3 长期方向） |
| OpenZeppelin CI 实践 | github.com/OpenZeppelin/openzeppelin-contracts/.github | 合约仓库的 CI 组织方式 |

---

## 9. 下一步（得到你确认后执行）

1. 你确认本计划（或让 ChatGPT 帮你看完回复我意见）；
2. 我创建 Issue #1–#6（M0），从 #1 开始逐个实施；
3. 每个 issue：建分支 → 实现 → 本地验证 → push → 开 PR（关联 issue）→ 等 CI 绿 → 合并；
4. M0 完成后 CI 就位，后续所有工作自动享受 5 分钟验证流水线。
