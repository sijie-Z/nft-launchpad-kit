# NFT Launchpad Kit — 贡献指南

感谢你参与 NFT Launchpad Kit 的开发！

## 项目简介

一站式 NFT 发行平台：Solidity (Hardhat) + Next.js 14。6 种铸造模式 + Factory Clone + 管理后台 + The Graph 子图。
代码在 `scaffold-alchemy-main/` 工作区内（yarn 3 workspaces：`packages/hardhat` + `packages/nextjs`）。

## 开发流程（核心约定）

**分支模型：`develop` 是开发主线，`main` 只做发布。**

```
feat/xxx ──► develop ──► main（发布 PR）
```

1. 所有改动必须先有 **issue**（功能/修复/文档均可），issue 里有验收标准。
2. **日常开发：分支从 `develop` 拉出，PR 合入 `develop`**（禁止直接推 `main`/`develop`）。
3. 发布：`develop → main` 的 release PR（如 v1.0.0），合并后打 tag。
4. 分支命名：`feat/<issue号>-<英文短描述>`，例如 `feat/3-ci-contract-job`。
5. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
   ```
   feat: 添加 xxx（#12）
   fix: 修复 xxx（#7）
   chore: 清理 xxx（#2）
   docs: 更新 xxx（#16）
   ci: 调整 xxx（#4）
   ```
6. PR 标题格式：`[#issue号] 一句话描述`；PR 描述自动关联 issue（`Closes #N`）。
7. **CI 全绿是合并的硬性条件**：
   - 合约：编译 + 99 测试（`yarn hardhat:test`）
   - 前端：`tsc --noEmit` 零错误 + 74 Vitest 用例 + lint 零 error
   - 目标：PR CI ≤ 5 分钟（两个 Job 并行）。PR 阶段不跑 `next build`（合并到 main/develop 后由 build workflow 跑真构建）。
8. 合并策略：**squash merge**，保持历史干净。

## 本地开发

```bash
cd scaffold-alchemy-main
yarn install --immutable

# 合约
yarn hardhat:compile        # 编译 Solidity
yarn hardhat:test           # 96 个合约测试（本地带 gas 报告）

# 前端
yarn workspace @scaffold-alchemy/nextjs check-types   # 类型检查
yarn workspace @scaffold-alchemy/nextjs test          # 74 个 Vitest 用例
yarn workspace @scaffold-alchemy/nextjs lint          # lint
yarn workspace @scaffold-alchemy/nextjs build         # 生产构建

# 本地起前端（默认端口 56900）
yarn start
```

环境变量：复制根目录 `.env.example` 为 `.env` 并填写。**严禁把真实密钥（Alchemy API Key、私钥）提交进仓库** —— 一律走环境变量 / GitHub Secrets。

## Issue 规范

- 用模板创建（feature / bug），填验收标准。
- 提交前搜索是否已有相同 issue，避免重复。

## PR 规范

- 一个 PR 只解决一个 issue（除非 issue 明确说明拆分）。
- PR 描述：改动内容 / 验证结果 / 注意事项。
- 若 PR 涉及决策（保留/删除功能），在描述里写明依据。
- 修改 PR 时根据 review 意见更新，解决对话后再请求 review。

## 安全提示

- 密钥只放在本地 `.env`（已 gitignore）和 GitHub Secrets 中。
- 涉及资金操作的合约改动，务必补安全回归测试（见 `test/NFTLaunchpadKit.audit.ts` 的清单模式）。
