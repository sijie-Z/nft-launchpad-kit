# Phase 1 执行计划 v1.1（已吸收 ChatGPT 审核意见，附裁定记录）

> **执行状态（2026-08-31 更新）**：
> - ✅ Phase 0 准备完成（deploy.yml 双网络、Secrets 清单见 docs/deployment-checklist.md —— 等你配 4 个 Secrets 即触发）
> - ✅ Phase 1A 完成：SDK 已发布 npm（`@nft-launchpad-kit/sdk` 0.1.2，ESM+CJS 双支持）、最小 API 认证上线、本地 dogfood 端到端实测通过
> - ✅ Week 2 物料就绪：池 A 测试协议（docs/pool-a-test-protocol.md）、池 B 物料（docs/pool-b-materials.md）、部署清单（docs/deployment-checklist.md）
> - ✅ 子图 ABI 过时 bug 已修复（codegen+build 通过）+ CI 子图 Job
> - ⏳ 等你醒来：①配 4 个 GitHub Secrets → 我触发部署验证 ②池 A/B 测试开始（物料已备好）

> v1.1 变更：吸收审核 4 项强制修改 + 6 项建议；修正 3 个双方遗漏点；保留 1 项未决。
> 背景段落（第 7 节）可整段复制给 ChatGPT。裁定记录见第 9 节。

---

## 0. 一句话战略（不变）

> **把"能用"变成"有人用"：极小的 Agent SDK + 两个独立用户池验证。**
> 目标不是做功能，是回答：**有没有人（或程序）愿意用这个平台发行 NFT？**

路线：`Phase 0 真实部署 → Phase 1A SDK（happy path）→ Phase 1B 双池验证 → Phase 2 按数据决定`。

---

## 1. Phase 0 —— 部署验证（Day 1，不是"有空再配"）

**这是整个实验的基础设施，必须在第一天完成，否则第 2 周才发现测试网部署有问题会打穿时间盒。**

| 步骤 | 谁 | 内容 |
|------|-----|------|
| 0.1 | **作者（你）** | 配 4 个 GitHub Secrets（2 分钟）：`PRIVATE_KEY`、`ALCHEMY_API_KEY`、`ETHERSCAN_API_KEY`、`BASESCAN_API_KEY`。**必须 Week 1 第一天完成。** |
| 0.2 | Claude | 触发 deploy workflow（Sepolia + Base Sepolia）→ 地址写入 deployedContracts → Etherscan 验证 → 前端真链冒烟 |

**依赖**：npm 发布需要作者提供 npm 账号（`npm login` 一次）—— 见 5.2。

---

## 2. Phase 1A —— Agent SDK MVP（Week 1：happy path 限定）

### 2.1 架构（审核修改 #2：明确分两层）

```
packages/sdk/  @nft-launchpad-kit/sdk
│
├─ API 层（REST 平台能力，带认证）
│    agents.register / collections.register / grants.issue / metadata.generate
│
└─ Chain 层（viem 链上执行器）
     collections.deploy（Factory clone）/ mint.execute
     collections.create = deploy + register（便捷方法，内部调两层）
```

```ts
const kit = new LaunchpadKit({
  baseUrl: "https://your-instance.com",
  apiKey: process.env.NLA_API_KEY,          // 认证（见 4）
  chain: "base-sepolia",                     // 链名
  wallet: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY),  // viem account
});

// Chain 层
const deployed = await kit.collections.deploy({ name: "AI Founder Pass", symbol: "AFP", supply: 1000, price: "0.01" });
// API 层
const collection = await kit.collections.register({ ...deployed, owner: kit.wallet.address });
// 便捷方法（= deploy + register）
// const collection = await kit.collections.create({ ... });

const grant = await kit.grants.issue({ collectionId: collection.id, minter: userAddress, quantity: 1 });
await kit.mint.execute({ collectionId: collection.id, grant });   // 用户钱包付 gas
const meta = await kit.metadata.generate({ name, imageUrl: "…/{id}.png", count: 1000 });
```

**要点**：
- `wallet` 在构造函数注入（真实 agent 后端往往已有钱包管理层；privateKey 仅作 quickstart 便捷）
- **MVP 不做平台代付**（避免钱包托管化：私钥管理/RPC/滥用/额度/盗刷一整套）
- 用户付 gas（用户钱包 → Factory → Collection）

### 2.2 Week 1 交付（happy path 限定，不加别的）

```
packages/sdk/（新 workspace）
├── src/{client,api,chain,types}.ts + 6 个公共方法
├── examples/agent-issuance.mjs   # dogfood 演示
├── README.md                     # 10 分钟指南（零币圈背景）
└── 单元测试（mock HTTP + 本地链冒烟）
```

**Week 1 不做**：错误处理全覆盖、边界情况、兼容性矩阵、认证管理后台。

### 2.3 认证（审核修改 #1：MVP 就有最小认证）

- 服务端：`PLATFORM_API_KEY` 环境变量 + 中间件。**写端点**（POST /agents、/collections、/signature、/metadata/generate）要求 `Authorization: Bearer <key>`；**读端点公开**
- SDK：`apiKey` 构造参数，自动带 header
- **前端豁免**（双方遗漏点 #1，见 9.1）：现有前端向导调用这些端点**不带 key** —— 中间件按 `Origin` 头豁免同源请求（浏览器同源请求不校验；跨域/服务端调用必须带 key）
- 本地开发：`NODE_ENV !== production` 时跳过校验（或允许 localhost）
- 代价：约 0.5 天。**不做**：账户系统/OAuth/RBAC/Billing（v2）

---

## 3. Phase 1B —— 双池验证（Week 2-4，审核修改 #3）

### 3.1 两个独立验证池（不再混为一个）

| 池 | 人群 | 验证假设 | 数量目标 |
|----|------|----------|----------|
| **A. Agent/开发者** | agent 开发者（作者圈子 2 + AI 社区 2 + 冷启动 1） | 愿意用 SDK 让 agent 发行 | 3-5 人 |
| **B. 项目方** | 真实社区/音乐/游戏项目 | 愿意用平台（向导）发行 | 2-3 个 |

**明确混入非同温层**（作者自己是 agent 开发者 → 池 A 至少 2 人来自陌生渠道，避免"5/5 喜欢 = 样本偏差"）。

### 3.2 话术（不变）

> "我免费帮你完整发行一次，你告诉我需求（发什么、给谁、多少量）。愿意试试吗？"

### 3.3 指标（审核修改 #4 + 新增结构化）

**时间指标（两个分开测）**：
- Setup Time：从 0 到环境跑起来
- First Issuance Time：**前置条件已满足**（有测试网钱包/测试 ETH/RPC/API key）→ npm install → 首次发行，**中位数 ≤10 分钟**

**首次失败原因（结构化）**：
```
failure_stage: install | auth | config | wallet | deployment | grant | mint | metadata | docs | unknown
```
（例：5 人里 3 人卡 wallet → 问题是 onboarding，不是核心功能。）

**承诺梯度（替代模糊的"付费意愿"）**：
```
L0 挺有意思 → L1 愿意试 → L2 完成发行 → L3 愿意再发 → L4 带真实用户来 → L5 愿意付钱（有价格、有下次、有承诺）
```

### 3.4 停止条件（三独立判定）

| 判定 | 条件 |
|------|------|
| **SDK 成功** | 池 A ≥2 人在无作者手把手指导下完成首次发行，且 median first-issuance ≤10 分钟 |
| **产品成功** | 池 B ≥2 个项目完成发行，且 ≥1 个再次发行/明确安排下一次 |
| **商业成功** | 任一池出现 **≥1 个 L5**（愿意为下一次真实发行付钱，且带价格承诺） |

---

## 4. 包名与发布（审核建议：现在就定，但别花时间）

- **第一版**：`@nft-launchpad-kit/sdk`（一眼明白是什么，scoped = 官方命名空间）
- 品牌（如 MiQi）等产品验证后再定；npm 发布前查一次名字占用
- **npm 公开发布进 Week 1**（双方遗漏点 #2，见 9.2）—— 陌生人测试必须 `npm install`，不能是 git clone monorepo

### 5.2 npm 发布依赖

- 作者提供 npm 账号一次（`npm login` 或 token）
- Claude 准备：`npm pack` 本地验证 → `npm publish`（0.1.0，先 unpkg 预览验证）
- 未提供 npm 账号时：SDK 仍可本地/workspace 使用，陌生人验证降级为"作者手动装包"，时间 +1 天

---

## 5. 时间盒（Week 1 只做 happy path；完整陌生人验证按 2 周看）

| 周 | 内容 | 产出 |
|----|------|------|
| W1 | Phase 0（作者 Day 1 配 Secrets）+ SDK happy path（deploy→grant→mint→query）+ npm publish 0.1.0 + dogfood 实录 | SDK v0.1 + 测试网真实部署 + 作者 agent 自证 |
| W2 | 陌生人测试（池 A ≥2）+ 错误处理/README/边界 + 池 B 首批触达（≥2 项目） | 使用数据 + failure_stage 分布 |
| W3-4 | 按反馈迭代 + 完成池 A 3-5 人 + 池 B 2-3 项目 + 停止条件判定 | 双池结论 + L5 信号 |

---

## 6. 分工

| 角色 | 负责 |
|------|------|
| 作者 | **Day 1 配 Secrets**、npm 账号、dogfood 执行（自己的 agent）、池 A/B 触达与陪跑、L5 确认 |
| Claude | SDK 全代码+测试+文档、认证中间件、npm 打包发布准备、部署验证执行、用户物料（话术/演示/失败登记表）、迭代实施 |

---

## 7. 已完成的上下文（可整段复制给 ChatGPT）

> 项目：开源 NFT 发行平台（github.com/sijie-Z/nft-launchpad-kit），v1.0.0 已发布。
> 技术栈：Solidity 合约（6 种铸造模式 + Factory Clone + 签名授权 + 多阶段发售）+ Next.js 前端（无代码创建向导、AI 元数据管线、管理后台）+ REST API（签名服务、agent 身份注册、集合管理）+ 204 个自动化测试 + 3-4 分钟 CI。
> 核心差异化：Agent 原生发行 —— trusted-signer 原语让"程序签发授权、用户铸造"成为可能；已有可运行示例。
> 部署：Sepolia + Base Sepolia（配置就绪，待最终验证）。
> 战略：作品（简历/开源名声）+ 小生意（能收钱）。作者主业是 AI agent 开发。

---

## 8. 待二次审核的问题（v1.1 新增）

1. 认证的 **Origin 豁免**方案（前端同源免 key、跨域必须带 key）—— 是否符合最小安全？有没有更简单的等效方案？
2. 池 A 的"5 人"是**目标不是保证**（0 star 仓库的分布现实）—— 停止条件应如何对"人不够"容错？(≤2 人时降级判定？)
3. 测试网验证对池 B（项目方）的**可信度问题**（"为什么要用测试网"）—— 怎么在话术里诚实处理？（诚实回答：Phase 1 验证流程；价值在主网，主网门槛 = 审计）
4. SDK 的 `create()` 便捷方法（内部 deploy+register）vs 强制两段式调用 —— 哪个对"10 分钟"指标更友好？

---

## 9. 裁定记录（本计划对审核意见的取舍）

### 9.1 吸收（审核的 4 项强制修改 + 6 项建议）

| 项 | 结论 |
|----|------|
| MVP 最小 API key | ✅ 吸收，但实现为"单平台 key + Origin 豁免 + localhost 跳过"，约 0.5 天 |
| SDK 分 API/Chain 两层 | ✅ 吸收，构造函数注入 wallet |
| 双池验证 | ✅ 吸收，独立判定 |
| 10 分钟指标重定义 + 中位数 | ✅ 吸收，加 failure_stage 结构化登记 |
| 包名 @nft-launchpad-kit/sdk | ✅ 吸收 |
| 承诺梯度 L0-L5 + repeat≠付费 | ✅ 吸收 |
| 混入非同温层 | ✅ 吸收 |
| W1 只做 happy path | ✅ 吸收 |
| npm 发布进 Week 1 | ✅ 吸收（依赖作者 npm 账号） |
| 市场改名 Distribution/Secondary，Seaport 优先，双用户触发条件 | ✅ 吸收 |

### 9.2 双方（审核与我）都遗漏的点（v1.1 补上）

1. **认证会打断现有前端**：向导/前端调用 POST /api/collections 等端点不带 key —— 直接加鉴权会弄坏产品本身。解法：Origin 豁免（同源免 key）。
2. **npm 发布是陌生人验证的前提**，但依赖作者 npm 账号 —— 明确为 5.2 的外部依赖。
3. **测试网可信度问题**：池 B（项目方）对"测试网发行"天然冷淡；必须诚实框定为"流程验证"，价值在主网（门槛 = 审计）。

### 9.3 保留的我的原判断（审核未推翻）

- Dogfood 显式化：作者自己的 agent 是第一个 SDK 用户 + "author's own agent issued this" 内容资产
- 市场触发判据收紧为"两个独立用户在发行过程中被交易需求阻塞"
- Phase 0 的阻塞者明确为作者本人（2 分钟操作），ChatGPT 说"Day 1 完成"正确，但执行主体是作者
