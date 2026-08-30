# #15 部署验证 —— 操作清单

> 目标：让平台在 Sepolia + Base Sepolia 测试网**真实可用**（SDK/向导/前端都能连真链）。
> 前置：`@nft-launchpad-kit/sdk` 已上线 npm（✅ 0.1.2），只差链上部署。

---

## 第 1 步：作者配 4 个 Secrets（约 2 分钟）

打开：`https://github.com/sijie-Z/nft-launchpad-kit/settings/secrets/actions`

| 名称 | 值来源 |
|------|--------|
| `PRIVATE_KEY` | 部署钱包私钥（**不带** 0x 开头；如无钱包，用 MetaMask 新建一个测试钱包） |
| `ALCHEMY_API_KEY` | https://dashboard.alchemy.com → Apps → 创建 App（选 Sepolia）→ 复制 API Key |
| `ETHERSCAN_API_KEY` | https://etherscan.io → 注册 → My API Key |
| `BASESCAN_API_KEY` | https://basescan.org → 注册 → My API Key |

测试 ETH：Sepolia → https://sepoliafaucet.com（或任一水龙头）；Base Sepolia → 从 Sepolia 跨链或 Coinbase 水龙头。

**配完跟 Claude 说一声即可，部署由 Claude 触发。**

---

## 第 2 步：Claude 执行（Secrets 配好后自动进行）

1. 触发 deploy workflow（Sepolia + Base Sepolia，手动 dispatch）
2. 验证：Etherscan/Basescan 合约验证通过
3. 把真实地址写入 `packages/nextjs/contracts/deployedContracts.ts`（11155111 + 84532 条目）
4. 前端冒烟：真链上铸造一次（Sepolia）
5. SDK 冒烟：`examples/agent-issuance.ts` 指向 Sepolia 实例跑通

---

## 第 3 步：验证结果记录

| 项 | 结果 |
|----|------|
| Sepolia NFTLaunchpadKit 地址 | |
| Sepolia Factory 地址 | |
| Base Sepolia NFTLaunchpadKit 地址 | |
| Base Sepolia Factory 地址 | |
| Etherscan 验证 | □ 通过 |
| Basescan 验证 | □ 通过 |
| 前端真链铸造 | □ 通过 |
| SDK 真链演示 | □ 通过 |

---

## 常见问题

- **水龙头不给 ETH**：换一个水龙头（Google 搜 "sepolia faucet"），或加入一个测试网水龙头 Discord 领
- **部署报错 PRIVATE_KEY missing**：确认 Secrets 名称拼写完全一致（大小写敏感）
- **Alchemy 无 Base 支持**：Alchemy 支持 Base；或直接填 `BASE_SEPOLIA_RPC_URL` 为公共 RPC（如 https://sepolia.base.org）
