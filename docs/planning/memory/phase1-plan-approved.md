---
name: phase1-plan-approved
description: "Phase 1 plan approved as execution baseline — SDK MVP + dual-pool validation, key decisions recorded"
metadata: 
  node_type: memory
  type: project
  originSessionId: 144eefe9-94f8-409c-965e-b91ce24c09e7
  modified: 2026-08-30T17:18:45.127Z
---

NFT Launchpad Kit 的 Phase 1 计划（`D:\Desktop\nft-launchpad-kit\nft-launchpad-kit\PHASE1_PLAN.md` v1.1）已经两轮 ChatGPT 审核并**批准作为执行 baseline**（2026-08-30）。

**核心假设**：
- H1：Agent 开发者愿意通过 SDK 使用我们的 NFT 发行能力
- H2：真实项目方愿意用平台完成真实发行流程
- H3：至少一个用户知道真实价格后仍愿意付费（L5 承诺梯度）

**关键决策**：
- SDK = 三层心智模型：Goal API（create/issue/mint/metadata）> Resource API（get/verify）> Primitive API（deploy/register）—— 用户只需理解"完成任务所需概念最少"，不追求 API 数量最少
- 认证 = 最小 API key（PLATFORM_API_KEY + Bearer）+ **Origin 豁免**（同源前端免 key）+ localhost 跳过 —— 兼容性策略，不是完整安全边界；危险端点（metadata/signature/collections）仍需限流
- npm 发布 = 0.1.0 手动发布，不做 org/自动化；依赖作者的 npm login（外部人工前置条件）
- 测试网话术必须诚实："验证发行流程（workflow value），不承诺真实商业发行；流程有效后带往主网"
- 市场 = Distribution/Secondary 集成（Seaport 优先），触发条件：两个独立用户在发行中被交易需求阻塞
- 主网门槛 = 合约稳定 + 经济模型冻结 + 审计 + 关键路径测试 + 权限明确 + 监控（审计只是其一）
- Phase 0（#15 部署验证）阻塞者是作者本人（2 分钟配 4 个 Secrets）

**Phase 1A 施工边界（第一批代码只允许这些）**：packages/sdk（client/agents/collections/grants/metadata/mint/index）+ 单元测试 + 本地链 happy path + npm 0.1.0 + 一个完整示例。**不做**：API key 管理后台、OAuth、retry framework、webhook、batch API、billing、multi-tenant、marketplace、agent framework 适配器（LangChain/OpenAI/MCP）。

**指标**：Setup Time / First Issuance Time（前置条件满足后，中位数 ≤10 分钟）+ assisted/unassisted 记录 + failure_stage 结构化登记 + 隐藏指标"用户是否主动读源码"。

**Phase 1A 执行状态（2026-08-31 更新）**：
- ✅ SDK MVP 完成并合入 develop（PR #51）
- ✅ **`@nft-launchpad-kit/sdk` 0.1.2 已发布 npm**（ESM+CJS 双构建，安装实测通过）—— 发布需浏览器设备流授权 + 安全密钥 2FA；npm 2026 政策：新账号发布必须启用 2FA（仅安全密钥，TOTP 已停用），密码登录不能发布
- ✅ 最小 API 认证（PLATFORM_API_KEY + Origin 豁免）上线
- ⏳ 待办：#15 部署验证（作者配 4 个 GitHub Secrets）、池 A/B 陌生人验证、npm 后续版本走 Trusted Publishing（包已存在，可在包设置页配置）

相关：[[nft-launchpad-ai-native-direction]]、[[research-first-before-building]]
