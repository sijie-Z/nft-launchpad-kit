# NFT Launchpad Kit — 问题清单（待审阅）

> 写给你拿去问 ChatGPT 的独立文档。只讲"有问题的地方"，不重复完整计划。
> 配套文档：`DEVELOPMENT_PLAN.md`（完整路线图）。
> 调查时间：2026-08-28。项目地址：github.com/sijie-Z/nft-launchpad-kit

---

## 背景（一句话）

Solidity (Hardhat) + Next.js 14 的 NFT 铸造平台（6 种铸造模式 + Factory Clone + 管理后台 + The Graph 子图），代码是 v34 旧代码，本地是毛坯，我们决定**不重写、基于旧代码继续**，改成"一个 issue 一个 PR + 快速 CI"的开发模式。

---

## 一、安全问题（最高优先级）

### 1. 硬编码 Alchemy API Key 提交进了仓库

**位置**：`packages/nextjs/config/defaultKeys.json`

```json
{
  "ALCHEMY_GAS_POLICY_ID": "f0d2920d-b0dc-4e55-ab21-2fcb483bc293",
  "ALCHEMY_API_KEY": "Aau4vg0U-46T4ZI857caO7otLxX3RVSo"
}
```

**问题**：
- `next.config.js` 里 `env: { ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || defaultKeys.ALCHEMY_API_KEY }` —— 环境变量缺失时**自动把仓库里的 key 注入构建产物**，等于把密钥打包进了每个用户浏览器里能拿到的 JS。
- 仓库是 public，key 已公开在 GitHub 历史上，即使删除，也在 git 历史里（7 个提交里可能多个包含）。

**我的处理计划**：删除文件中的真实 key（改为空字符串 + 构建时校验缺失则报错）；建议你到 Alchemy 后台轮换这两组 key（已泄露，删除不解决问题）。

**想听的意见**：
- 除了轮换，是否需要从 git 历史彻底清除（filter-repo 重写历史）？还是因为"已轮换"就直接接受历史里有？
- 这个项目只是学习/演示用途，轮换后是否够安全？

### 2. 构建错误被主动吞掉

**位置**：`next.config.js` + 旧 CI `test.yaml`

```js
typescript: { ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true" },
eslint: { ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true" },
```

旧 CI 还专门设置 `NEXT_PUBLIC_IGNORE_BUILD_ERROR: "true"` —— 意味着 CI 里的 `next build` **从不检查类型错误和 lint**，跑了也白跑。

**我的处理计划**：删除这个开关逻辑，CI 里 `tsc --noEmit` + lint 失败即红，build 用真实检查跑。

---

## 二、CI 问题（从未真正跑起来）

### 3. GitHub Actions 从未运行过

仓库 `.github/workflows/` 有 3 个 workflow（test.yaml / lint.yaml / deploy.yaml），但 **Actions 运行记录为空** —— 可能从未成功触发，或跑过没留下记录。

### 4. 旧 CI 设计问题

| 问题 | 位置 | 说明 |
|------|------|------|
| 无依赖缓存 | 3 个 workflow 的 `yarn install` | `setup-node` 没配 `cache: yarn`，每次全量安装（这个 monorepo 装一次 2–4 分钟） |
| 串行执行 | `test.yaml`：build-frontend `needs: test` | 先跑完合约测试才装前端依赖 |
| lint 失败被吞 | `test.yaml`：`continue-on-error: true` | 红也是绿 |
| 模板残留 | `lint.yaml`：`yarn chain & yarn deploy` | 起本地链 + 部署，又慢又脆，是 scaffold 模板原样 |
| 重复触发 | test.yaml 和 lint.yaml 都监听 push/PR | 同一提交触发两次 CI |
| 构建忽略错误 | 见问题 2 | — |
| 前端测试不在 CI | 只有合约测试 | 74 个 Vitest 用例从来没被 CI 验证过 |

**我的处理计划**：重写为单一 `ci.yml`：
- Job A（合约）：`yarn install`(缓存) → `hardhat compile` → `hardhat test`（预计 2.5–3.5 分钟）
- Job B（前端）：`yarn install`(缓存) → `tsc --noEmit` → `vitest run` → `next lint`（预计 3–4 分钟）
- 两个 job 并行，总时长约 4 分钟；PR 阶段不跑 `next build`（太重，类型安全由 tsc 保证），build 只在合并到 main 后跑。
- 部署用 `workflow_dispatch` 手动触发 + GitHub Secrets。

**想听的意见**：
- "PR 不跑 next build、合并后才跑"这个取舍是否合理？还是宁可 CI 慢 2 分钟也要在 PR 里真 build？
- 前端测试依赖 mock（不连真库），是否足够？还是应该加集成测试？

---

## 三、仓库卫生问题

### 5. 双锁文件冲突

**位置**：根目录同时存在：
- `package-lock.json`（997KB，npm 生成）
- `yarn.lock`（740KB，yarn 3 生成）

项目实际用 yarn 3（`.yarnrc.yml` + `.yarn/releases/`），`package-lock.json` 是残留，与 `yarn.lock` 内容互不一致，任何人用 npm install 都会破坏依赖树。

**我的处理计划**：删除 `package-lock.json`，锁定 yarn 为唯一包管理器。

### 6. 环境变量文档缺失

**位置**：`packages/nextjs/lib/env.ts` 要求 `DATABASE_URL`（required: true），但 `.env.example` 里**没有 DATABASE_URL 这一项**。照抄模板的人启动必报错。

**我的处理计划**：对齐 `.env.example` 与 `env.ts` 校验清单。

### 7. 其他卫生问题

| 问题 | 说明 |
|------|------|
| `packages/subgraph/package-lock.json` 独立存在 | 子图包不在 yarn workspaces 内，用 npm 装，双包管理器并存 |
| `README.md` 说"82 个测试" | 实际 96+ 合约测试 + 74 前端测试 = 170，文档过时 |
| `PROJECT.md` 说合约"~900 行" | 实际 1218 行 |
| `PROJECT.md` 声称多项"已完成" | 部分与代码对不上（如 debug 路由：说已移除导航，代码里全套还在） |

---

## 四、代码层面的问题/候选

### 8. debug 路由完整保留但不在导航

**位置**：`packages/nextjs/app/debug/`（16 个文件，scaffold 自带合约调试 UI）

PROJECT.md 说 v25 已从导航移除，但代码全套保留。保留对合约调试有用，但增加维护面。

### 9. 前端依赖可能有大量未使用项

**位置**：`packages/nextjs/package.json` 里可疑依赖（待用 knip 核实）：

```
@uniswap/sdk-core, @uniswap/v2-sdk   ← 没有 DEX/swap 功能
burner-connector                     ← 钱包 burner 模式，项目用 Account Kit
next-auth                            ← 没用到的认证方案（项目用钱包签名 /api/auth）
react-copy-to-clipboard              ← 可能被自写逻辑替代
@types/dotenv                        ← devDependencies 里的类型包混入 dependencies
```

未用依赖会增大安装体积、拖慢 CI（与"3–5 分钟"目标直接相关）。

### 10. 其他候选问题（待核实）

| 候选 | 说明 |
|------|------|
| `account-kit`（账户抽象）依赖较重 | @account-kit/react + infra + core 三个包，安装体积大；PROJECT.md 记录过 v33 修过一次导入路径 bug，说明它维护成本存在 |
| 子图不在主 CI | graph build 下载数百 MB，注定不能进 5 分钟 CI，需独立 workflow |
| 合约未做静态分析验证 | PROJECT.md 声称 Slither 通过，但需要重新跑验证 |
| `.env.example` 里的 ALCHEMY_GAS_POLICY_ID | 也指向已泄露的 key，需一并处理 |

---

## 五、执行中发现的新问题（2026-08-28 实施时）

| # | 发现 | 说明 | 状态 |
|---|------|------|------|
| N1 | **CI 从未运行的真正根因** | workflows 放在 `scaffold-alchemy-main/.github/workflows/`，GitHub **只识别仓库根目录** `.github/workflows/` —— 3 个旧 workflow 根本不会被发现 | 已修复（#3/#4） |
| N2 | **hardhat `check-types` 有历史错误** | `utils/getAccountKitClient.ts` 从 hardhat.config 导入不存在的导出 + 2 个测试文件类型错误 —— 从未被 CI 覆盖所以一直没暴露 | 待修复（记入 #7） |
| N3 | **1 个 flaky 合约测试** | 约 1/6 运行率随机失败一次（4 次连续重跑未复现），疑似时间戳/顺序相关 | 待追查（记入 #7） |
| N4 | **gas-reporter v2 默认开启** | 不需要 REPORT_GAS 也会打印 gas 表格（v1 是环境变量门控，v2 改了默认） | 已修复（#3） |
| N5 | **`validateEnv()` 从未被调用** | `lib/env.ts` 的启动校验只存在于测试里，应用启动时不执行 —— 环境变量缺失时应用照常跑 | 待接入（建议新 issue） |
| N6 | **GitHub Actions Node 20 弃用警告** | runner 强制用 Node 24 跑 actions（checkout@v4 等），无功能影响 | 待升级 actions 版本 |
| N7 | **网络：github.com:443 间歇性不可达** | 本机（国内网络）到 GitHub 亚太 IP 间歇丢包，push 需重试（约 1-6 次），api.github.com 一直通 | 影响开发体验，建议配镜像/代理 |

---

## 六、想听 ChatGPT 的重点问题

1. **密钥处理**：轮换后 git 历史里的 key 是否需要 filter-repo 重写？（public 仓库、个人学习项目）
2. **CI 取舍**：PR 里用 `tsc` 代替 `next build` 是否可接受？有没有更优的"快且全"组合？
3. **依赖瘦身**：第 9 节列出的未用依赖是否可安全删除？有没有更好的扫描工具（knip vs depcheck vs eslint-plugin-import）？
4. **测试策略**：前端 API 测试全 mock prisma，CI 里是否需要加真实 DB（如 sqlite 文件）集成测试层？还是 mock 足够？
5. **debug 路由**：保留还是删除？这种 scaffold 自带功能在长期维护里通常怎么处理？
6. **开发流程**："一个 issue 一个 PR + 4 分钟 CI" 这个节奏对单人维护者是否合适？有没有建议的简化？

---

## 附：我的执行顺序（已得到用户同意，按此推进）

1. Issue #1 安全清理（删 key + 去 IGNORE 开关）
2. Issue #2 锁文件清理
3. Issue #3–4 CI 重写（合约 job / 前端 job）
4. Issue #5 真实 build + 部署流水线
5. Issue #6 issue/PR 模板
6. M1 合约基线 → M2 前端基线 → M3 部署发布
