# 🔄 交接文档 —— 恢复工作时先读这个

> 最后更新：2026-09-02
> 项目：NFT Launchpad Kit（Agent 原生发行基础设施）
> 当前阶段：**Phase 1A 已完成，Phase 0（部署验证）就差领测试币**

---

## 一、现在在哪一步（30 秒看懂）

```
✅ 代码全部完成并推送到 GitHub
✅ SDK 已发布 npm（@nft-launchpad-kit/sdk 0.1.2）
✅ 测试物料齐备（池 A/B 协议）
✅ 部署流水线就绪（PRIVATE_KEY 已配好）
⏳ 只差：给测试钱包领 Sepolia 测试币 → 触发部署 → 真实链上可用
```

---

## 二、两个仓库

| 仓库 | 内容 | 地址 |
|------|------|------|
| **代码（公开）** | 全部代码 + 文档 | https://github.com/sijie-Z/nft-launchpad-kit |
| **规划文档** | 本文档 + 战略/计划/问题清单（同仓库 ） | 本仓库 |

- 代码主线：`main`（发布）/ `develop`（开发）
- npm 包：https://www.npmjs.com/package/@nft-launchpad-kit/sdk

---

## 三、恢复了先做什么（按顺序）

### 第 1 步：给测试钱包领测试币（唯一卡点，5 分钟）

1. 打开 https://sepolia-faucet.pk910.de/（免注册）
2. 粘贴地址：`0xD2E2187aDe9275ce77305EB5f5d75e42C5AB01F0`
3. 挖矿 → Claim 领约 0.5 ETH

> 这个钱包的私钥**已经在 GitHub Secrets 里配好了**（不需要你管），只需要给地址充测试币。

### 第 2 步：触发部署验证

领到币后，跟 Claude 说："测试币领到了，触发部署"

Claude 会做：
1. `gh workflow run deploy.yml -f network=sepolia`
2. 验证部署结果 + Etherscan 验证（需要 ETHERSCAN_API_KEY，可选）
3. 把真实合约地址写进 `packages/nextjs/contracts/deployedContracts.ts`
4. 跑 SDK 真链演示（你的 agent 第一次在真实测试网发行）

### 第 3 步：开始池 A/B 验证（核心目标）

- **池 A**（agent 开发者）：按 `docs/pool-a-test-protocol.md` 找 3-5 人测试 SDK
- **池 B**（真实项目）：按 `docs/pool-b-materials.md` 找 2-3 个团队免费发行
- 数据回来 → 按停止条件判定 → 决定 Phase 2

---

## 四、环境信息（恢复时用）

| 项 | 值 |
|----|-----|
| 部署钱包地址 | `0xD2E2187aDe9275ce77305EB5f5d75e42C5AB01F0` |
| 私钥存放 | GitHub Secrets（已配 `PRIVATE_KEY`） |
| 本地代码 | `D:\Desktop\nft-launchpad-kit\code`（git 仓库，已同步） |
| 规划文档 | 本文件夹（已备份到私有仓库） |
| npm 账号 | sijiez（发布了 @nft-launchpad-kit/sdk） |

**公司电脑注意事项**：
- 本地无 .env 文件、无 npm token 残留、私钥不在任何本地文件中 ✅
- 若要彻底清理：删除 `D:\Desktop\nft-launchpad-kit\` 整个文件夹即可（所有内容已在 GitHub）
- npm 2FA 已配置安全密钥（Windows Hello）—— 换电脑后需重新登录 npm（`npm login`）

---

## 五、项目现状速览

| 项 | 状态 |
|----|------|
| 合约 | 6 种铸造模式 + Factory Clone + 100 测试 ✅ |
| 前端 | 无代码创建向导 + AI 元数据管线 + 管理后台 ✅ |
| SDK | npm 0.1.2（ESM+CJS）✅ |
| API | agent 身份注册 + 签名服务 + 最小认证 ✅ |
| 测试 | 204 + SDK 8 + 中间件 7 全绿 ✅ |
| CI | 3-4 分钟（合约 / 前端 / 子图三 Job）✅ |
| 部署 | 流水线就绪，等测试币 ⏳ |
| 文档 | 英文 README + 3 教程 + 池 A/B 协议 + 托管指南 ✅ |

---

## 六、关键决策记录（避免重复讨论）

- **战略**：Agent 原生发行（"the agent issues, the user mints"），不是古典 launchpad
- **SDK 形态**：薄 REST 封装 + chain executor，三层心智模型（Goal/Resource/Primitive）
- **认证**：最小 API key + 同源豁免（不是完整安全边界，是兼容性策略）
- **市场**：暂缓，触发条件 = 两个独立用户被交易需求阻塞；届时走 Seaport 集成而非自建
- **验证优先**：不做功能堆砌，先用池 A/B 验证 PMF
- **停止条件**：池 A ≥2 人无帮助完成 ≤10 分钟；池 B ≥2 团队完成 + ≥1 再发；商业 = ≥1 个 L5 付费承诺

完整计划见本文件夹 `PHASE1_PLAN.md`，战略见 `STRATEGY.md`。

---

## 七、恢复时给 Claude 的第一句话（复制用）

> 继续 NFT Launchpad Kit 的 Phase 1。先读 docs/planning/ 目录下的 HANDOFF.md 和 POST_DEPARTURE_PLAN.md 恢复上下文，然后告诉我下一步该做什么。
