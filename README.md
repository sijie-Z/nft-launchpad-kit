# NFT Launchpad Kit

一站式 NFT 发行平台：6 种铸造模式 + Factory Clone + 管理后台，Solidity + Next.js。

## 功能

**铸造模式：**
- 公开铸造（固定价格 + 每钱包限制）
- 白名单铸造（Merkle Proof 验证）
- 荷兰拍卖（价格随时间递减）
- 签名授权铸造（传统 + EIP-712 结构化签名）
- ERC20 代币支付铸造
- Phased Claim Conditions（多阶段分发，支持 Merkle 白名单）

**合约特性：**
- ERC721A 批量铸造（70-90% gas 节省）
- ERC-1167 Minimal Proxy Clone（93% 部署 gas 节省）
- ERC-2981 版税标准
- EIP-712 域分隔 + nonce 防重放
- SafeERC20（兼容 USDT 等非标准代币）
- ReentrancyGuard + Pausable + AccessControl
- 33 个自定义错误（零字符串 require）
- 37 个事件（支持链下索引）
- Feistel 密码链上 tokenURI 洗牌

**前端：**
- Next.js + viem + scaffold-alchemy
- 管理后台（仪表盘 + 事件日志 + 8 个管理面板）
- 白名单管理器（CSV 上传 → Merkle Root 生成）
- 实时铸造活动流 + 交易状态 + Gas 估算

## 快速开始

```bash
# 安装依赖（yarn 3，含 prisma generate）
cd scaffold-alchemy-main
yarn install

# 合约测试
yarn hardhat:test          # 96 个合约测试

# 前端（vitest / 类型检查 / lint）
yarn workspace @scaffold-alchemy/nextjs test          # 74 个前端测试
yarn workspace @scaffold-alchemy/nextjs check-types   # 类型检查
yarn workspace @scaffold-alchemy/nextjs dev           # 本地开发（端口 56900）
```

环境变量：复制根目录 `.env.example` 为 `.env` 并填写（Alchemy API Key 等）。
开发流程、分支/PR 规范见 `scaffold-alchemy-main/CONTRIBUTING.md`。

## 测试

```bash
cd scaffold-alchemy-main

# 运行全部 96 个合约测试（本地附带 gas 报告；CI 中关闭以提速）
yarn hardhat:test

# 前端：74 个 Vitest 用例
yarn workspace @scaffold-alchemy/nextjs test
```

## CI（GitHub Actions）

- `ci.yml`：PR 触发 —— 合约测试 + 前端类型/测试/lint 并行，约 3-4 分钟
- `build.yml`：合并到 main/develop 后真实 `next build`
- `deploy.yml`：手动触发 Sepolia 部署（GitHub Secrets）

## 分支模型

- `main`：只做发布（develop → main 的 release PR，合并后打 tag）
- `develop`：日常开发主线，feature 分支从这里拉出、PR 合入这里
- 详细规范见 `scaffold-alchemy-main/CONTRIBUTING.md`

## 多链部署（#37）

支持 Sepolia（默认）与 **Base Sepolia**：

```bash
cd scaffold-alchemy-main

# Sepolia（默认）
yarn deploy:final                       # 或 npx hardhat deploy --network sepolia

# Base Sepolia —— agent 经济的主场
yarn deploy:base                        # npx hardhat deploy --network baseSepolia
yarn verify:base                        # Etherscan/Basescan 验证（需 BASESCAN_API_KEY）
```

- 环境变量：`SEPOLIA_RPC_URL` / `BASE_SEPOLIA_RPC_URL`（缺省走 Alchemy）、`ETHERSCAN_API_KEY` / `BASESCAN_API_KEY`、`PRIVATE_KEY`
- 部署后把合约地址写入 `packages/nextjs/contracts/deployedContracts.ts` 对应 chainId（84532 条目已预置）
- 前端 `scaffold.config.ts` 已配置双网络（`targetNetworks[0]` = Sepolia 为主链）

## 项目结构

```
scaffold-alchemy-main/       # Yarn 3 工作区
├── packages/
│   ├── hardhat/             # 智能合约
│   │   ├── contracts/
│   │   │   ├── NFTLaunchpadKit.sol        # 主合约（~1200 行，96 测试）
│   │   │   └── NFTLaunchpadKitFactory.sol # Clone 工厂
│   │   ├── test/            # 测试（96 个）
│   │   └── deploy/          # 部署脚本
│   ├── nextjs/              # 前端（74 个测试）
│   │   ├── components/      # UI 组件
│   │   ├── app/             # 页面路由 + API
│   │   └── utils/           # 工具库（Merkle、签名、错误映射）
│   └── subgraph/            # The Graph 子图
└── GAS_BASELINE.md          # Gas 回归基准
└── TEST_BASELINE.md         # 前端测试基线
```

## 技术栈

| 层 | 技术 |
|---|------|
| 合约 | Solidity 0.8.20 · ERC721A · OpenZeppelin · viaIR |
| 前端 | Next.js 14 · viem · wagmi · TailwindCSS |
| 测试 | Hardhat · Chai · hardhat-gas-reporter |
| 部署 | hardhat-deploy · Sepolia 测试网 |

## 安全机制

- ReentrancyGuard（所有 payable + withdraw 函数）
- Pausable（紧急暂停所有铸造）
- AccessControl（角色分级：DEFAULT_ADMIN / OPERATOR）
- CEI 模式（Checks-Effects-Interactions）
- 签名 nonce 防重放
- 零地址检查
- 超额 ETH 自动退还
- SafeERC20（兼容非标准 ERC20）
- Initializable 防护（_disableInitializers）

## 测试覆盖

| 模块 | 测试数 |
|------|--------|
| 核心铸造 | 9 |
| 审计路径 | 20 |
| Claim Conditions | 32 |
| 压测 | 8 |
| Factory Clone | 13 |
| **总计** | **82** |

## License

MIT
