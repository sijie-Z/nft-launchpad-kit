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
# 安装依赖
yarn install

# 启动本地区块链
cd packages/hardhat
npx hardhat node

# 部署合约
npx hardhat deploy --network localhost

# 启动前端
cd packages/nextjs
npm run dev
```

## 测试

```bash
cd packages/hardhat

# 运行全部 82 个测试
npx hardhat test

# Gas 报告
npx hardhat test --grep "Gas"
```

## 项目结构

```
├── packages/
│   ├── hardhat/              # 智能合约
│   │   ├── contracts/
│   │   │   ├── NFTLaunchpadKit.sol        # 主合约（~950 行）
│   │   │   └── NFTLaunchpadKitFactory.sol # Clone 工厂
│   │   ├── test/             # 测试（82 个）
│   │   └── deploy/           # 部署脚本
│   └── nextjs/               # 前端
│       ├── components/       # UI 组件
│       ├── app/              # 页面路由
│       └── utils/            # 工具库（Merkle、签名、错误映射）
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
