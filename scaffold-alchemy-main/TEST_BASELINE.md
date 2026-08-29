# 前端测试基线（Frontend Test Baseline）

> 生成时间：2026-08-29
> 命令：`yarn workspace @scaffold-alchemy/nextjs test`（vitest 4.1.5，node 环境）
> 基准提交：cf6fdb4（main）

## 总览

**74 个用例 / 10 个文件，连续 5 轮全绿**（无 flaky）。

| 文件 | 用例数 | 覆盖内容 |
|------|--------|----------|
| `__tests__/lib/rateLimit.test.ts` | 13 | IP 滑动窗口限流器 |
| `__tests__/api/whitelist.test.ts` | 12 | 白名单 CRUD + proof 查询 |
| `__tests__/lib/env.test.ts` | 10 | 环境变量校验 |
| `__tests__/api/collections.test.ts` | 10 | 集合 CRUD + 分页 + 权限 |
| `__tests__/api/mint-records.test.ts` | 9 | 铸造记录查询/写入 |
| `__tests__/api/signature.test.ts` | 6 | 签名授权生成 |
| `__tests__/api/ipfs.test.ts` | 5 | IPFS 元数据上传 |
| `__tests__/api/auth.test.ts` | 4 | 钱包签名认证 |
| `__tests__/api/analytics.test.ts` | 3 | 平台/集合统计 |
| `__tests__/api/health.test.ts` | 2 | 健康检查 |
| **合计** | **74** | |

## 测试方式说明

- 全部 API 测试 **mock prisma**（`vi.mock("~~/lib/prisma")`）—— CI 不需要真实数据库
- 环境：`vitest` node 环境，无浏览器依赖
- 本地单轮耗时约 10s

## CI 覆盖

CI（#4，`ci.yml` Job B）会跑 `tsc --noEmit` + `vitest run` + `next lint`，前端测试从合并后开始由 CI 强制守护。

## 对比方式

```bash
cd scaffold-alchemy-main
yarn workspace @scaffold-alchemy/nextjs test
```
