# NFT Launchpad Kit — 项目文档

> 最后更新：2026-05-10（v33 — API 测试 + Web Vitals + Prisma 迁移确认）

---

## 一、项目现状总览

### 1.1 完成度评估

| 模块 | 状态 | 完成度 | 说明 |
|------|------|--------|------|
| **智能合约** | ✅ 完成 | 99% | 6 种铸造模式 + Phased Claim Conditions + Factory Clone + SafeERC20 + 布尔打包 + 签名 nonce + 延迟揭示、39 事件、33 自定义错误、96 测试、已部署 Sepolia |
| **后端 API** | ✅ 完成 | 95% | 9 个 REST 端点 + IP-based 速率限制 + 环境变量校验，Prisma + SQLite |
| **数据库** | ✅ 完成 | 90% | 6 个模型（User、Collection、MintRecord、ClaimPhase、WhitelistEntry、PlatformConfig） |
| **测试套件** | ✅ 完成 | 99% | 137 个测试用例（96 合约：20 核心 + 21 审计 + 38 Claim + 8 压测 + 9 Factory + 41 前端 API 测试） |
| **部署脚本** | ✅ 完成 | 100% | 已部署到 Sepolia 测试网，Factory + Implementation 双合约 |
| **前端铸造页面** | ✅ 完成 | 97% | Hero 营销区 + 网络守卫 + 集合信息 + 合约信息 + 实时活动流 + 交易状态 + 成功弹窗 + Gas 估算 |
| **前端管理后台** | ✅ 完成 | 94% | 仪表盘（含分析） + 事件日志（含筛选） + 8 管理面板 + 白名单管理器 + 确认对话框 + 输入验证 + 权限检查 |
| **前端产品页面** | ✅ 完成 | 90% | 集合发现页、集合详情页、NFT 画廊（tokenURI 元数据渲染）+ 铸造历史视图 |
| **前端工具库** | ✅ 完成 | 99% | 20 个组件 + 3 个工具库，全部 viem 兼容 |
| **CI/CD** | ✅ 完成 | 85% | GitHub Actions 测试+构建+部署流水线 |
| **文档** | ✅ 完成 | 90% | 本文档 + 小白开发文档 + README |
| **合约安全审计** | ⚠️ 初步 | 30% | Slither 静态分析通过（39 项均为可接受/误报），未经过专业第三方审计 |
| **测试网部署** | ✅ 完成 | 100% | Sepolia 测试网：NFTLaunchpadKit (0x7597D0) + Factory (0x1e3200) |
| **前端生产构建** | ✅ 完成 | 100% | `next build` 已通过 |
| **GitHub 仓库** | ✅ 完成 | 100% | https://github.com/sijie-Z/nft-launchpad-kit |
| **Etherscan 验证** | ⚠️ 就绪 | 80% | `verify:sepolia` 脚本已配置，需设置 ETHERSCAN_API_KEY 环境变量 |
| **子图/索引** | ✅ 完成 | 90% | The Graph 子图，索引 29 个事件，9 个实体，支持 Factory Clone 动态数据源 |

### 1.2 诚实的问题清单

**必须解决才能上线的问题：**

1. ~~**合约未部署**~~ ✅ 已部署 Sepolia（NFTLaunchpadKit: 0x7597D0, Factory: 0x1e3200）
2. **未经过安全审计** — 合约涉及资金操作，主网部署前必须审计
3. ~~**Sepolia 测试网未部署**~~ ✅ 已部署并验证

**应该解决但不阻塞上线的问题：**

4. ~~**前端无真实图片/品牌**~~ ✅ 已完成（v25），自定义 SVG logo + favicon + OG metadata + JSON-LD
5. ~~**无 The Graph 子图**~~ ✅ 已完成（v20），索引 29 个事件，9 个实体
6. **无多签钱包** — 合约 owner 是单个 EOA，风险集中
7. ~~**白名单 Merkle Proof 需要后端服务**~~ ✅ `/api/whitelist/proof` 已实现（v26）
8. ~~**签名铸造需要后端签名服务**~~ ✅ `/api/signature` 已实现（v26）

**已解决的问题：**

- ✅ 前端生产构建通过（`next build` 无错误）
- ✅ 合约 32 个事件全部实现并 emit（支持链下索引）
- ✅ 合约错误映射（`errorMap.ts`）— 30+ 错误转友好提示
- ✅ Admin 仪表盘（`AdminDashboard`）— 总铸造数/收入/价格/状态
- ✅ Admin 事件日志（`AdminEventLog`）— 实时合约活动流
- ✅ NetworkGuard 网络守卫（检测错误链 + 一键切换 Sepolia）
- ✅ ContractInfo 合约信息面板（地址、所有者、Etherscan、部署状态）
- ✅ TxStatus 交易状态指示器（pending/mining/confirmed/failed）
- ✅ GasEstimate Gas 估算显示
- ✅ CollectionStats 集合信息栏
- ✅ RecentMints 实时铸造活动流
- ✅ MintSuccess 铸造成功弹窗（含 Twitter 分享）
- ✅ ErrorBoundary 全局错误边界
- ✅ LoadingSkeleton 加载骨架屏
- ✅ 404 页面
- ✅ 链配置修正为 Sepolia（11155111）
- ✅ Footer / manifest / OG 品牌更新
- ✅ CSS 动画 + 移动端安全区域 + 无障碍焦点样式 + prefers-reduced-motion
- ✅ GasEstimate 组件集成到所有 5 种铸造模式（基于 gasLimit 估算）
- ✅ 铸造数量输入验证（step=1、onBlur 下限保护、NaN 防护）
- ✅ Merkle Proof 输入自动修正（缺失 0x 前缀自动补全）
- ✅ 签名截止时间纯数字验证（防无效输入）
- ✅ 区块浏览器链接动态化（`getBlockExplorerTxLink` 替代硬编码 Sepolia）
- ✅ 路由级 `loading.tsx` 骨架屏（`/` → MintSkeleton、`/admin` → 管理后台骨架）
- ✅ 管理后台管理员权限检查（`hasRole(DEFAULT_ADMIN_ROLE)` → 非管理员显示拒绝页面）
- ✅ LoadingSkeleton 骨架屏组件实际接入（之前是死代码）
- ✅ 交易状态修正（`pending` → `mining` 基于 `isMining` hook → `confirmed`）
- ✅ 安全修复：`withdraw`/`withdrawToken`/`withdrawSplit` 添加 `nonReentrant` 重入保护
- ✅ 白名单管理器（`WhitelistManager`）— CSV 上传 → Merkle Root 生成 → 一键设置 + Proof 测试
- ✅ Merkle 工具升级 — 支持分级白名单（per-wallet quantity），参考 thirdweb ClaimCondition
- ✅ Admin 仪表盘增强 — 独立铸造者数、近 100 区块活跃度、人均铸造量、收入 USD 估值
- ✅ Debug 路由从 Header 导航移除（v25）
- ✅ 自定义品牌视觉 — SVG logo + favicon + manifest 配色（v25）
- ✅ Hero 营销首页 — 渐变背景 + 价值主张 + 特性卡片 + CTA（v25）
- ✅ NFT 画廊 — My NFTs 页面展示实际 NFT 图片/元数据（通过 tokenURI + IPFS 解析）（v25）
- ✅ SEO 增强 — JSON-LD 结构化数据 + 完善的 OG/Twitter meta（v25）
- ✅ 合约 @author 更新为 sijie-Z（v25）
- ✅ 集合页搜索/排序/分页（v26）— 搜索框 + 7 种排序 + 状态筛选 + 分页导航
- ✅ 签名铸造后端 API（v26）— `POST /api/signature`，V2 EIP-712 签名 + UID 生成
- ✅ 白名单 Proof 后端 API（v26）— `POST /api/whitelist/proof`，支持分级白名单
- ✅ Admin 多集合选择器（v26）— `AdminCollectionSelector` 组件，集合切换 + 统计预览
- ✅ 社交分享增强（v26）— Twitter + Telegram + 复制交易哈希 + 集合名称显示
- ✅ NFTTokenCard IPFS 容错（v27）— 3 个 IPFS 网关自动回退 + res.ok 检查
- ✅ CollectionStats 去硬编码（v27）— 版税/状态/链名全部从合约/配置读取
- ✅ ContractInfo 去硬编码（v27）— 网络名从 scaffoldConfig 读取
- ✅ API 权限加固（v27）— PUT/DELETE 需 ownerAddress 验证，非 owner 返回 403
- ✅ NetworkGuard 错误处理（v27）— switchChain 失败时显示错误提示
- ✅ 签名铸造一键获取（v28）— NFTMintUI 签名模式新增"Get Signature"按钮，调用 /api/signature 自动填充
- ✅ Admin 实时 ETH 价格（v28）— CoinGecko API 替代硬编码 $2000，每分钟刷新
- ✅ 合约 NatSpec 英文化（v28）— 全部中文注释翻译为英文，保留技术准确性
- ✅ Sepolia 水龙头链接（v28）— NetworkGuard 错误网络页面添加 sepoliafaucet.com 链接
- ✅ API 速率限制（v29）— 全部 9 个写入端点添加 IP-based 滑动窗口限流（strict: 10/min, normal: 30/min）
- ✅ 环境变量校验（v29）— `lib/env.ts` 启动时检查必需/可选 env vars，缺失时明确报错
- ✅ .env.example 完善（v29）— 添加 DATABASE_URL、SIGNER_PRIVATE_KEY、ETHERSCAN_API_KEY 说明
- ✅ 签名一键获取 Bug 修复（v29）— 字段名修正（minterAddress→minter）+ 补充 contractAddress/chainId
- ✅ 健康检查端点（v30）— `GET /api/health`，检查数据库连通性 + 响应延迟，供负载均衡器/监控使用
- ✅ 签名按钮 loading 状态（v30）— 点击后显示 spinner + 禁用重复点击 + "Requesting Signature..."文案
- ✅ 全页面 try/catch 错误处理（v31）— collections/[id]、collections、my-nfts 三个页面 fetch 调用全部包裹 try/catch，网络错误显示友好提示 + Retry 按钮
- ✅ 路由级 error.tsx（v31）— collections、collections/[id]、my-nfts、admin 四个路由添加 error.tsx，渲染错误时显示错误页面 + 重试按钮
- ✅ 404 页面优化（v31）— 添加 "Browse Collections" 链接
- ✅ Footer 修正（v31）— "ERC-721" → "ERC-721A"（项目实际使用 ERC721A）
- ✅ OG 图片动态生成（v32）— `/api/og` Edge Runtime 端点，渐变背景 + 品牌 Logo + 标题/副标题 + "Live on Sepolia" 徽章，社交分享时自动渲染
- ✅ Sitemap（v32）— `/sitemap.xml` 动态生成，包含首页/集合/我的NFT/管理后台 4 个路由，支持 `NEXT_PUBLIC_SITE_URL` 环境变量
- ✅ AdminCharts 修复（v32）— SVG 渐变 ID 冲突（useState 计数器）、公开铸造负值防护（Math.max）、累计图表时间戳漂移修复、ARIA 无障碍标签、加载状态
- ✅ 图表加载状态（v32）— transferEvents 为 null 时显示 spinner，为空时显示"暂无数据"提示
- ✅ 10 个 REST API 端点 + /api/og + /api/health + /sitemap.xml
- ✅ 前端 API 测试套件（v33）— Vitest + 5 个测试文件 + 41 个测试用例（rateLimit、env、health、signature、collections）
- ✅ Web Vitals 性能监控（v33）— CLS/FCP/LCP/TTFB 指标采集，支持 Vercel Analytics 发送
- ✅ Prisma 迁移确认（v33）— schema 与 init migration 完全同步，无 drift
- ✅ `@account-kit/infra` 导入路径修复（v33）— `alchemyEnhancedApiActions` 改为子路径 `@account-kit/infra/enhanced-apis`
- ✅ 96 合约测试 + 41 前端测试 = 137 总测试

### 1.3 后端 API 与数据库（v19）

**技术栈：** Prisma 5 + SQLite + Next.js API Routes

**数据库模型：**

| 模型 | 说明 |
|------|------|
| User | 钱包地址用户，自动创建 |
| Collection | NFT 集合（名称、合约地址、状态、配置） |
| MintRecord | 铸造记录（txHash、数量、模式、时间） |
| ClaimPhase | Claim Conditions 阶段配置 |
| WhitelistEntry | 白名单条目（地址 + 最大铸造数） |
| PlatformConfig | 平台级配置（手续费、平台钱包） |

**API 端点：**

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/collections` | GET/POST | 集合列表/创建 |
| `/api/collections/[id]` | GET/PUT/DELETE | 集合详情/更新/删除 |
| `/api/mint-records` | GET/POST | 铸造记录查询/记录 |
| `/api/whitelist` | GET/POST/DELETE | 白名单管理（批量） |
| `/api/auth` | POST | 钱包签名认证 |
| `/api/analytics` | GET | 平台/集合级统计 |
| `/api/ipfs` | POST | IPFS 元数据上传（Pinata） |
| `/api/signature` | POST | 签名铸造授权生成（V2 EIP-712 + UID） |
| `/api/whitelist/proof` | POST | 白名单 Merkle Proof 查询（支持分级白名单） |
| `/api/health` | GET | 健康检查（数据库连通性 + 延迟） |
| `/api/og` | GET | OG 图片动态生成（Edge Runtime，社交分享用） |
| `/sitemap.xml` | GET | 动态站点地图（首页/集合/我的NFT/管理后台） |

**产品页面：**

| 页面 | 路由 | 说明 |
|------|------|------|
| 集合发现 | `/collections` | 卡片展示、状态筛选 |
| 集合详情 | `/collections/[id]` | 铸造 UI + 最近铸造 + 统计 |
| 我的 NFTs | `/my-nfts` | 个人铸造历史 |

### 1.4 The Graph 子图（v20）

**技术栈：** @graphprotocol/graph-cli 0.80.1 + AssemblyScript

**索引事件（29 个）：**

| 类别 | 事件 | 说明 |
|------|------|------|
| 铸造 | Transfer, MintedBySignature, MintedByAllowlist, MintedByAuction, MintedByERC20, Claimed | 全铸造模式追踪 |
| Claim Conditions | ClaimConditionsSet, ClaimConditionUpdated, PhaseAdvanced | 多阶段售卖状态 |
| 资金 | FundsSplit, Withdraw, TokenWithdrawn | 分账与提现 |
| 配置 | SaleStateChanged, AllowlistSaleStateChanged, MintPriceUpdated, MaxPerWalletUpdated, MerkleRootUpdated, DutchAuctionConfigured, TrustedSignerUpdated, RoyaltyUpdated, ERC20TokenAccepted, BaseURIUpdated, PreRevealURIUpdated, PausedStateChanged | 全部管理操作 |
| 延迟揭示 | DelayedRevealSet, DelayedRevealRevealed | 加密元数据 URI 设置与揭示 |
| 权限 | OwnershipTransferred | 所有权转移 |
| 工厂 | CollectionCloned | 新集合部署 |

**GraphQL 实体（9 个）：**

| 实体 | 说明 |
|------|------|
| Collection | 集合信息 + 统计（totalMinted, uniqueMinters, totalRevenue） |
| MintRecord | 单次铸造记录（minter, quantity, paymentType, mintType） |
| Wallet | 钱包分析（totalMinted, totalEthSpent, collectionCount） |
| DailySnapshot | 每日快照（mintCount, ethVolume, uniqueMinters） |
| PlatformStats | 平台级统计（totalCollections, totalMinted, totalEthVolume） |
| ClaimPhase | Claim Conditions 阶段（supplyClaimed, isActive） |
| FundSplit | 分账记录 |
| Withdrawal | 提现记录 |
| ConfigChange | 配置变更历史 |

**Factory Clone 支持：**
- 使用 `NFTLaunchpadKitClone` 动态数据源模板
- Factory 的 `CollectionCloned` 事件自动为新克隆创建数据源
- 克隆合约的铸造/配置事件独立索引

**部署方式：**
- Subgraph Studio（推荐，免费托管）
- 或自托管 Graph Node

### 1.5 Sepolia 测试网部署（v17）

| 合约 | 地址 | Gas | Etherscan |
|------|------|-----|-----------|
| NFTLaunchpadKit | `0x7597D0D4e46Ad4E35bFfe8a52616d809765F4B22` | 5,142,916 | [查看](https://sepolia.etherscan.io/address/0x7597D0D4e46Ad4E35bFfe8a52616d809765F4B22) |
| NFTLaunchpadKitFactory | `0x1e320041d3106022965C7846EE7bcbceab65a8e1` | 678,269 | [查看](https://sepolia.etherscan.io/address/0x1e320041d3106022965C7846EE7bcbceab65a8e1) |

- 部署者: `0x555f6FD8EB31b83f3d9C66d78d21EFE0DA755329`
- 网络: Sepolia (chainId: 11155111)
- 配置: maxSupply=10000, maxPerWallet=5, mintPrice=0.01 ETH

### 1.5 v11 全面 Bug 审计报告

**审计范围：** 智能合约、前端组件、工具库、测试套件
**发现 Bug：** 40 个（合约 13 + 前端 27）
**已修复：** 40/40（100%）

#### 合约 Bug（13 个）

| # | 严重度 | Bug | 修复 |
|---|--------|-----|------|
| 1 | CRITICAL | `mintDutchAuction` 未检查拍卖是否开始（`auctionStartTime == 0`），导致免费铸造 | 添加 `if (auctionStartTime == 0) revert SaleNotActive()` |
| 2 | CRITICAL | CEI 违规：`_tokenIdTracker` 在 `_safeMint` 之后更新，重入攻击可重复 tokenId | 将 `_tokenIdTracker = currentSupply + quantity` 移到 `_safeMint` 前 |
| 3 | HIGH | 所有 mint 函数缺少超额 ETH 退还，用户多付的 ETH 丢失 | 添加 excess ETH refund（`msg.sender.call{value: excess}`） |
| 4 | HIGH | `transferOwnership` 未同步 `DEFAULT_ADMIN_ROLE`，新 owner 无管理权限 | 覆写 `transferOwnership`，同步 revoke/grant role |
| 5 | HIGH | `withdraw()` 在有 `payoutRecipients` 时静默跳过，不报错 | 添加 `require(payoutRecipients.length == 0)` 和 `require(bal > 0)` |
| 6 | MEDIUM | `_configureDutchAuction` 接受 `startPrice = 0`，拍卖无效 | 添加 `require(startPrice > 0, "StartPrice=0")` |
| 7 | MEDIUM | 6 个 mint 函数重复 `maxPerWallet` 逻辑（~180 行重复代码） | 提取 `_batchMint` 内部函数统一逻辑 |
| 8 | MEDIUM | `configureDutchAuction` 和 `configureDutchAuctionByRole` 完全重复 | 提取 `_configureDutchAuction` 内部函数 |
| 9 | LOW | 构造函数缺少 `_maxSupply > 0` / `_maxPerWallet > 0` 校验 | 添加 require 校验 |
| 10 | LOW | 构造函数 `_maxPerWallet` 可大于 `_maxSupply`，逻辑错误 | 添加 `require(_maxPerWallet <= _maxSupply)` |
| 11 | LOW | `FINANCE_ROLE` 定义但从未使用（dead code） | 移除 |
| 12 | LOW | `RevealNotReady` 错误定义但从未使用 | 移除 |
| 13 | LOW | TokenId 洗牌用简单取模旋转（`currentSupply % totalSupply`），可预测 | 替换为 Feistel 密码（4 轮 keccak256） |

#### 前端 Bug（27 个）

| # | 严重度 | 文件 | Bug | 修复 |
|---|--------|------|-----|------|
| 1 | CRITICAL | layout.tsx | `initialState?.alchemy.chain.id` 空引用崩溃 | 改为 `initialState?.alchemy?.chain?.id` |
| 2 | CRITICAL | NFTMintUI.tsx | `hasAllow` 比较错误（70 字符 vs 66 字符 bytes32） | 使用正确长度的 zeroBytes32 |
| 3 | HIGH | admin/page.tsx | admin 权限未加载完成时渲染管理面板（闪现） | 添加 `isAdmin === undefined` loading guard |
| 4 | HIGH | NFTMintUI.tsx | `isMining`/`txStatus` 竞态：tx 已确认但 UI 仍显示 mining | 移除 `txStatus === "pending"` 从 useEffect 条件 |
| 5 | HIGH | admin/page.tsx | BPS 输入包含空字符串导致 `BigInt()` 崩溃 | 添加 `.filter(Boolean)` |
| 6 | HIGH | NFTMintUI.tsx | `mintERC20` 缺少 `saleOn &&` 守卫 | 添加售卖状态检查 |
| 7 | MEDIUM | ContractInfo.tsx | 硬编码 Sepolia chain ID `11155111`，多链失效 | 改为 `useChainId()` 动态获取 |
| 8 | MEDIUM | ContractInfo.tsx | 硬编码 Etherscan URL | 改为 `viem/chains` 动态获取 |
| 9 | MEDIUM | ContractInfo.tsx | `deployedContracts[chainId]` 类型错误 | 改为 `Record<number, any>` 强转 |
| 10 | MEDIUM | RecentMints.tsx | 硬编码 Sepolia Etherscan URL | 改为动态 explorer URL |
| 11 | MEDIUM | NetworkGuard.tsx | 硬编码 Sepolia 名称和 chain ID | 改为 `scaffoldConfig.targetNetworks[0]` |
| 12 | MEDIUM | MintSuccess.tsx | `txHash.slice(10, 18)` 不检查长度，短 hash 报错 | 添加 `txHash.length > 18` 守卫 |
| 13 | MEDIUM | AdminDashboard.tsx | 硬编码 ETH/USD 汇率无标注 | 添加 "(approx)" 标签 |
| 14 | MEDIUM | admin/page.tsx | 荷兰拍卖输入无类型/范围验证 | 添加 type="number", min, step, isValidPrice |
| 15 | MEDIUM | admin/page.tsx | 签名截止时间输入可接受非数字字符 | 添加 digits-only 验证 |
| 16 | MEDIUM | admin/page.tsx | BPS 数组为空时 `BigInt("")` 崩溃 | 添加 filter(Boolean) 防护 |
| 17 | LOW | AdminEventLog.tsx | React key `${event.tx}-${i}` 不稳定 | 改为 `${event.tx}-${event.block}-${event.type}` |
| 18 | LOW | AdminEventLog.tsx | map 回调中未使用的 `i` 变量 | 移除 `i` |
| 19 | LOW | ContractInfo.tsx | 硬编码 "Verified" 徽章（未验证也显示） | 移除 |
| 20 | LOW | ContractInfo.tsx | import 顺序不符合项目规范 | viem/chains 放在 wagmi 前 |
| 21 | LOW | RecentMints.tsx | `(event.args.to as string)` 不安全类型断言 | 添加 `|| ""` fallback |
| 22 | LOW | RecentMints.tsx | import 顺序不符合项目规范 | 修正 |
| 23 | LOW | NFTMintUI.tsx | tx 失败后 txHash 未清除，显示过期链接 | 失败时 `setTxHash(null)` |
| 24 | LOW | signature.ts | 未使用的 `MINT_TYPEHASH` 常量 | 移除 |
| 25 | LOW | signature.ts | 未使用的 imports (`encodeAbiParameters`, `toBytes`, `toHex`) | 移除 |
| 26 | LOW | admin/page.tsx | 输入属性过长，prettier 报错 | 改为多行格式 |
| 27 | LOW | multiple files | 前端 prettier 格式化不一致 | 全部源文件 prettier --write |

---

## 二、技术架构

### 2.1 项目结构

```
NFT_Launchpad_Kit/
├── .env                              # 环境变量（私钥、API Key）
├── .gitignore                        # Git 忽略规则
├── PROJECT.md                        # 本文档
└── scaffold-alchemy-main/            # 主工作区（Yarn Workspaces）
    ├── package.json                  # 根 package.json
    ├── .github/workflows/
    │   ├── test.yaml                 # CI：自动测试 + 构建
    │   └── deploy.yaml               # CD：手动部署 Sepolia
    ├── packages/
    │   ├── hardhat/                  # 智能合约
    │   │   ├── contracts/
    │   │   │   ├── NFTLaunchpadKit.sol   # 核心合约（~900 行，36 个事件，含 Phased Claim Conditions）
    │   │   │   └── TestERC20.sol         # 测试代币
    │   │   ├── test/
    │   │   │   ├── NFTLaunchpadKit.advanced.ts  # 9 个核心测试
    │   │   │   ├── NFTLaunchpadKit.audit.ts     # 20 个审计覆盖测试
    │   │   │   └── NFTLaunchpadKit.claimConditions.ts  # 32 个 Claim Conditions 测试
    │   │   ├── deploy/
    │   │   │   └── 01_deploy_nftlaunchpad.ts
    │   │   └── hardhat.config.ts
    │   └── nextjs/                   # 前端
    │       ├── app/
    │       │   ├── layout.tsx        # 根布局（含 ErrorBoundary）
    │       │   ├── loading.tsx       # 首页加载骨架屏
│       │   ├── sitemap.ts        # 动态站点地图
│       │   ├── not-found.tsx     # 404 页面
    │       │   ├── page.tsx          # 首页（铸造）
    │       │   ├── admin/
    │       │   │   ├── page.tsx      # 管理后台（8 个 Tab + 权限检查）
    │       │   │   └── loading.tsx   # 管理后台加载骨架屏
    │       │   └── debug/page.tsx    # 合约调试
│       │   ├── api/
│       │   │   ├── og/route.tsx  # OG 图片动态生成（Edge Runtime）
│       │   │   └── health/route.tsx # 健康检查端点
    │       ├── components/
    │       │   ├── NFTMintUI.tsx     # 铸造主组件（~690 行）
    │       │   ├── NetworkGuard.tsx  # 网络守卫（错误链检测+切换）
    │       │   ├── CollectionStats.tsx # 集合元数据展示栏
    │       │   ├── ContractInfo.tsx  # 合约信息面板（地址+所有者+Etherscan）
    │       │   ├── RecentMints.tsx   # 实时铸造活动流
    │       │   ├── MintSuccess.tsx   # 铸造成功弹窗（含Twitter分享）
    │       │   ├── TxStatus.tsx      # 交易状态指示器
    │       │   ├── GasEstimate.tsx   # Gas 估算显示
    │       │   ├── AdminDashboard.tsx # 管理后台仪表盘（指标卡片 + 分析）
    │       │   ├── AdminEventLog.tsx # 管理后台事件日志
    │       │   ├── WhitelistManager.tsx # 白名单管理器（CSV→Root→Proof 测试）
    │       │   ├── ErrorBoundary.tsx # 全局错误边界
    │       │   ├── LoadingSkeleton.tsx # 加载骨架屏
    │       │   ├── Header.tsx        # 导航栏
    │       │   └── Footer.tsx        # 底部栏
    │       ├── lib/
    │       │   ├── prisma.ts         # Prisma 客户端单例
    │       │   ├── rateLimit.ts      # IP-based 滑动窗口速率限制
    │       │   ├── env.ts            # 环境变量校验与启动检查
    │       │   └── webVitals.ts      # Web Vitals 性能指标采集（CLS/FCP/LCP/TTFB）
    │       ├── __tests__/
    │       │   ├── lib/
    │       │   │   ├── rateLimit.test.ts  # 速率限制器测试（7 用例）
    │       │   │   └── env.test.ts        # 环境变量校验测试（10 用例）
    │       │   └── api/
    │       │       ├── health.test.ts     # 健康检查端点测试（2 用例）
    │       │       ├── signature.test.ts  # 签名 API 测试（6 用例）
    │       │       └── collections.test.ts # 集合 API 测试（16 用例）
    │       ├── utils/
    │       │   ├── errorMap.ts       # 合约错误映射（30+ 错误 → 友好提示）
    │       │   ├── merkle.ts         # Merkle Tree 白名单工具（viem）
    │       │   └── signature.ts      # 签名授权工具（viem）
    │       └── contracts/
    │           └── deployedContracts.ts  # 合约 ABI + 地址
    └── 小白开发文档.txt
```

### 2.2 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 合约语言 | Solidity | 0.8.20 |
| 合约库 | OpenZeppelin + ERC721A | v5.4.0 + v4.3.0 |
| 开发框架 | Hardhat | v2.22.10 |
| 前端框架 | Next.js (App Router) | 14 |
| UI | TailwindCSS + DaisyUI | 3.4 + 4.12 |
| Web3 | wagmi + viem | 2.13 |
| 账户抽象 | @account-kit/react | 4.35 |
| 包管理 | Yarn 3 (Workspaces) | 3.2.3 |
| 测试框架 | Vitest | 4.1.5 |
| 性能监控 | Web Vitals | 5.2.0 |

---

## 三、智能合约

### 3.1 NFTLaunchpadKit.sol 功能矩阵

| 功能 | 函数 | 测试 | 说明 |
|------|------|------|------|
| 批量铸造核心 | `_batchMint(to, qty, limit)` | ✅ | 内部函数，所有铸造模式共享 |
| 公开铸造 | `mint(qty)` | ✅ | ETH 支付，限购检查 |
| 白名单铸造 | `mintAllowlist(qty, proof)` | ✅ | Merkle 树验证 |
| 荷兰拍卖 | `mintDutchAuction(qty)` | ✅ | 价格线性下降 |
| 签名铸造（传统） | `mintWithSignature(...)` | ✅ | 链下签名 + 链上验证 |
| 签名铸造（EIP-712） | `mintWithSignature712(...)` | ✅ | 结构化签名 |
| 签名铸造 V2（传统+UID） | `mintWithSignatureV2(...)` | ✅ | UID 防重用 + 自定义价格 |
| 签名铸造 V2（EIP-712+UID） | `mintWithSignature712V2(...)` | ✅ | UID 防重用 + 自定义价格 + 结构化签名 |
| ERC20 铸造 | `mintWithERC20(qty)` | ✅ | 代币支付 |
| 分账提现 | `withdrawSplit()` | ✅ | 按 BPS 比例分配，nonReentrant |
| 版税 | `setDefaultRoyalty(...)` | ✅ | EIP-2981 |
| 揭示 | `commitReveal()` / `finalizeReveal()` | ✅ | Commit-Reveal 洗牌 |
| 延迟揭示 | `setDelayedRevealURI()` / `revealDelayedURI()` | ✅ | AES-256-CTR 加密元数据 URI |
| Phased Claim | `claim(qty, proof)` + 4 admin + 4 view | ✅ | N 阶段售卖（参考 thirdweb） |
| 暂停 | `pause()` / `unpause()` | ✅ | 紧急开关 |
| 角色权限 | `OPERATOR_ROLE` / `FINANCE_ROLE` | ✅ | AccessControl |

### 3.2 Gas 消耗（最新测试数据）

| 操作 | Gas | 说明 |
|------|-----|------|
| 合约部署 | 5,165,738 (17.2% 区块上限) | ERC721A + Claim Conditions + Initializable（全部自定义错误） |
| Factory 部署 | 678,266 (2.3% 区块上限) | Factory 合约 |
| Clone 部署 | 371,081 (节省 93.2%) | 通过 Factory 克隆 |
| 公开铸造 | 82,090 - 167,560 | 取决于数量（ERC721A 批量优化） |
| 白名单铸造 | 133,454 - 140,359 | 含 Merkle Proof 验证 |
| 荷兰拍卖铸造 | 141,741 | 含价格计算 |
| 签名铸造 | 160,114 - 165,009 | 含 ECDSA 恢复 + nonce 防重放 |
| EIP-712 签名铸造 | 160,915 - 165,822 | 含 EIP-712 域验证 + nonce 防重放 |
| ERC20 铸造 | 172,468 | 含 ERC20 transferFrom |
| Claim 铸造 | 101,333 - 192,311 | Phased Claim Conditions |
| 分账提现 | 62,272 | 含 FundsSplit 事件 |
| 设置版税 | 28,199 | EIP-2981 |
| 设置分账 | 162,959 | 含数组存储 |
| 配置荷兰拍卖 | 115,997 | 内部函数提取后降低 30% |
| 设置 Merkle Root | 48,997 | bytes32 存储 |
| 延迟揭示设置 | 117,145 | 含 string + bytes32 存储 |
| 延迟揭示揭示 | 56,690 - 96,646 | 替换 URI |
| 暂停 | 48,794 | |
| 取消暂停 | 26,470 | |

### 3.3 Phased Claim Conditions（v12 新增）

参考 thirdweb `Drop.sol` 设计，支持 N 阶段售卖：

```solidity
struct ClaimCondition {
    uint64  startTimestamp;          // 阶段开始时间
    uint48  maxSupply;               // 本阶段最大可铸造量
    uint48  supplyClaimed;           // 本阶段已铸造量
    uint48  quantityLimitPerWallet;  // 每钱包限额
    address currency;                // 支付代币（address(0)=ETH）
    uint256 pricePerToken;           // 本阶段单价
    bytes32 merkleRoot;              // 本阶段白名单根（bytes32(0)=公开）
    string  metadata;               // 阶段描述（链下用）
}
```

**支持场景：** Discord OG → Twitter WL → Early Bird → Public，每阶段独立配置价格/供应/时限/白名单。

| 函数 | 类型 | 说明 |
|------|------|------|
| `claim(qty, proof)` | 用户 | 自动检测当前阶段，支持 ETH/ERC20 + Merkle Proof |
| `setClaimConditions(phases)` | Admin | 设置全部阶段（按时间升序） |
| `setClaimCondition(id, cond)` | Admin | 更新单个阶段 |
| `nextPhase()` | Admin | 手动推进到下一阶段 |
| `resetClaimConditions()` | Admin | 清空所有阶段 |
| `getActiveClaimPhase()` | View | 返回当前阶段 ID + 数据 |
| `getClaimConditionById(id)` | View | 按 ID 查询阶段 |
| `getClaimTimestamp(addr, id)` | View | 查询某地址在某阶段的铸造次数 |
| `getClaimConditionCount()` | View | 返回阶段总数 |

**设计亮点：**
- 与现有铸造模式（公开/白名单/荷兰拍卖/签名/ERC20）完全独立，共享全局供应上限
- `_claimMint` 内部函数不触碰 `_walletMints`，两个系统互不干扰
- 阶段用完自动推进，无需手动操作
- 存储优化：uint48 用于供应/数量字段，减少 storage slot

### 3.4 Factory Clone 部署模式（v14 新增）

`NFTLaunchpadKitFactory.sol` 使用 ERC-1167 最小代理（Clones）实现超低成本的多集合部署：

**核心架构：**
- 实现合约（Implementation）部署一次（~5.4M gas），后续每个集合只需 ~371k gas（节省 93%）
- `Clones.clone()` 创建 45 字节的最小代理，所有调用委托给实现合约
- `initialize()` 函数替代构造函数，为每个克隆设置独立的 name/symbol/owner/参数
- `_disableInitializers()` 防止直接部署的合约被误初始化

**Factory 功能：**
- `deployCollection()` — 普通克隆部署
- `deployCollectionDeterministic()` — CREATE2 确定性部署（可预测地址）
- `predictCollectionAddress()` — 部署前预测地址
- `getAllCollections()` / `getCollectionsByOwner()` — 集合查询
- `setImplementation()` — 升级实现合约

**Clone-Aware 设计：**
- `name()` / `symbol()` 重写：克隆读 `_cloneName`/`_cloneSymbol`，直接部署读 ERC721A 默认值
- 每个克隆拥有独立的存储（mint state、claim conditions、ownership 等）

### 3.5 事件索引（39 个事件）

合约为每个关键操作都发射事件，支持链下索引和 The Graph 子图：

| 事件 | 触发函数 | 说明 |
|------|----------|------|
| `SaleStateChanged` | setSaleState, setSaleStateByRole | 公开销售开关 |
| `AllowlistSaleStateChanged` | setAllowlistSaleState, setAllowlistSaleStateByRole | 白名单销售开关 |
| `MintPriceUpdated` | setMintPrice | 价格变更 |
| `MaxPerWalletUpdated` | setMaxPerWallet | 限购变更 |
| `MerkleRootUpdated` | setAllowlistMerkleRoot | 白名单根更新 |
| `DutchAuctionConfigured` | configureDutchAuction(…ByRole) | 拍卖参数配置 |
| `TrustedSignerUpdated` | setTrustedSigner | 签名者更新 |
| `RoyaltyUpdated` | setDefaultRoyalty | 版税更新 |
| `PayoutRecipientsUpdated` | setPayoutRecipients | 分账配置 |
| `FundsSplit` | withdrawSplit | 分账执行 |
| `ERC20TokenAccepted` | setAcceptedToken | 代币配置 |
| `RevealCommitted` | commitReveal | 揭示承诺 |
| `RevealFinalized` | finalizeReveal | 揭示完成 |
| `BaseURIUpdated` | setBaseURI | 元数据 URI |
| `PreRevealURIUpdated` | setPreRevealURI | 占位 URI |
| `PausedStateChanged` | pause, unpause | 暂停状态 |
| `Withdraw` | withdraw | ETH 提现 |
| `TokenWithdrawn` | withdrawToken | ERC20 提现 |
| `MintedBySignature` | mintWithSignature(…712) | 签名铸造 |
| `MintedByAllowlist` | mintAllowlist | 白名单铸造 |
| `MintedByAuction` | mintDutchAuction | 拍卖铸造 |
| `MintedByERC20` | mintWithERC20 | ERC20 铸造 |
| `ClaimConditionsSet` | setClaimConditions | 全部阶段设置 |
| `ClaimConditionUpdated` | setClaimCondition | 单阶段更新 |
| `PhaseAdvanced` | claim / nextPhase | 阶段自动/手动推进 |
| `Claimed` | claim | Claim 铸造（含阶段ID+支付额） |
| `DelayedRevealSet` | setDelayedRevealURI | 延迟揭示 URI 设置 |
| `DelayedRevealRevealed` | revealDelayedURI | 延迟揭示完成 |
| `CollectionCloned` | deployCollection(…Deterministic) | Factory 克隆部署 |
| + 10 个 OZ 标准事件 | Transfer, Approval, Paused 等 | ERC721/AccessControl |

### 3.4 安全机制

- **ReentrancyGuard** — 所有 payable 函数 + 所有 withdraw 函数
- **Pausable** — 紧急暂停所有铸造（含 claim）
- **AccessControl** — 角色分级（DEFAULT_ADMIN, OPERATOR）
- **Custom Errors** — 33 个自定义错误，零字符串 require
- **unchecked 安全算术** — 退还差值、循环递增等安全位置
- **EIP-712 域分隔** — 防跨合约/跨链签名重放
- **ECDSA 签名验证** — 传统 + EIP-712 双模式
- **签名 Nonce 防重放** — 每地址递增 nonce，签名包含 nonce，用后自增，彻底防止签名重放
- **Merkle Proof** — Gas 高效白名单验证（Legacy + Claim Conditions 双系统）
- **_batchMint / _claimMint** — 两套铸造路径共享全局供应上限，互不干扰
- **Feistel 密码** — 不可逆 tokenURI 洗牌，防止稀有度预测
- **CEI 模式** — 所有铸造函数遵循 Checks-Effects-Interactions（claim 已修复）
- **超额退还** — 所有 ETH 铸造函数自动退还多余金额
- **零地址检查** — setAcceptedToken、setTrustedSigner、Factory.setImplementation
- **Initializable 防护** — _disableInitializers() 防止直接部署合约被误初始化
- **布尔打包** — saleIsActive/allowlistSaleIsActive/revealed 打包为 uint8，节省 2 个存储槽
- **延迟揭示** — AES-256-CTR 加密元数据 URI 存链上，揭示前内容不可见，支持与 Feistel 揭示共存

### 3.5 安全分析

✅ **Slither 静态分析通过**（39 项均为可接受模式或误报）：
- reentrancy-benign/events（4 项）— 工厂 clone 调用，无共享状态
- low-level-calls（8 项）— 退款/提现的标准模式
- naming-convention（15 项）— `_quantity` 风格偏好
- 其余（12 项）— 时间戳依赖、循环成本、圈复杂度等固有特征

⚠️ **未经第三方审计。** 主网部署前建议请专业审计公司（OpenZeppelin/Trail of Bits/Consensys Diligence）审计
- 在 Immunefi 上设置 Bug Bounty

---

## 四、前端

### 4.1 页面

| 路径 | 文件 | 功能 |
|------|------|------|
| `/` | `app/page.tsx` | 铸造首页 |
| `/admin` | `app/admin/page.tsx` | 管理后台 |
| `/debug` | `app/debug/page.tsx` | 合约调试（scaffold 自带） |

### 4.2 前端工具库

| 文件 | 功能 | 状态 |
|------|------|------|
| `utils/merkle.ts` | Merkle Tree 白名单 proof 生成（支持分级白名单） | ✅ viem 兼容 |
| `components/WhitelistManager.tsx` | 白名单管理器（CSV 上传 + Root 生成 + Proof 测试） | ✅ 已集成 |
| `utils/signature.ts` | 签名授权铸造（传统 + EIP-712） | ✅ viem 兼容 |
| `utils/delayedReveal.ts` | AES-256-CTR 延迟揭示加密/解密（Web Crypto API） | ✅ 零依赖 |
| `components/HeroSection.tsx` | 首页 Hero 营销区（渐变背景 + 特性卡片 + CTA） | ✅ 已集成 |
| `components/NFTTokenCard.tsx` | NFT 画廊卡片（tokenURI → IPFS 元数据 → 图片渲染） | ✅ 已集成 |
| `components/AdminCollectionSelector.tsx` | Admin 多集合选择器（集合切换 + 统计预览） | ✅ 已集成 |
| `components/ErrorBoundary.tsx` | 全局 React 错误边界 | ✅ 已集成 |
| `components/LoadingSkeleton.tsx` | 铸造页/通用/卡片骨架屏（已接入路由加载） | ✅ 已集成 |

**merkle.ts 函数：**
- `generateMerkleTree(addresses)` — 从地址列表生成 Merkle 树（简单模式）
- `generateMerkleTreeWithQty(entries)` — 分级白名单（每个地址不同限额，参考 thirdweb）
- `getProof(data, address)` — 为指定地址生成 proof（简单模式）
- `getProofWithQty(data, address, maxQty)` — 为指定地址生成 proof（分级模式）
- `isWhitelisted(data, address)` — 验证地址是否在白名单
- `parseAddressList(input)` — 从 CSV 解析地址列表
- `parseAllowlistWithQty(input)` — 从 CSV 解析分级白名单（address,maxQty 每行一对）

**signature.ts 函数：**
- `signMintAuth712(account, params)` — EIP-712 结构化签名（推荐）
- `signMintAuth(account, params)` — 传统签名（兼容旧合约）
- `batchSignMintAuth712(account, addresses, params)` — 批量签名

### 4.3 铸造页面功能

- **网络守卫**：检测错误链，显示切换到 Sepolia 的按钮
- **集合信息栏**：ERC-721 标准、链名、供应量、已铸造数、价格、限购、版税、状态
- **Hero 区域**：进度环、铸造量、价格、限购信息、Live/Paused 状态徽章
- **荷兰拍卖倒计时条**（实时更新，5 秒轮询价格）
- **5 种铸造模式切换**（自动检测合约配置，未配置的模式灰显）
- **交易状态指示器**：pending → mining → confirmed/failed，含 Etherscan 链接
- **铸造成功弹窗**：Etherscan 链接 + Twitter 分享按钮
- **合约信息面板**：合约地址、所有者、网络、Etherscan 链接、部署状态检测
- **实时铸造活动流**：监听 Transfer 事件，显示最近铸造记录
- **错误通知**：合约调用失败时显示短错误信息
- **钱包未连接提示**：引导用户连接钱包

### 4.4 管理后台功能

- Sale Control：公开/白名单/暂停开关、价格、限购、URI、Commit-Reveal
- Dutch Auction：配置拍卖参数
- Whitelist：CSV 上传地址 → 自动生成 Merkle Root → 一键设置 + Proof 测试
- Royalty：设置版税接收地址和比例
- Revenue Split：配置分账地址和比例
- Trusted Signer：设置签名者
- ERC20：配置代币支付
- Withdraw：ETH 提现 / 分账提现

### 4.5 前端状态

**已解决：**

- ✅ `next build` 生产构建通过，零类型错误
- ✅ NetworkGuard 网络守卫（检测错误链 + 一键切换 Sepolia）
- ✅ ContractInfo 合约信息面板（地址、所有者、Etherscan、部署状态检测）
- ✅ TxStatus 交易状态指示器（pending → mining → confirmed/failed）
- ✅ GasEstimate Gas 估算显示
- ✅ CollectionStats 集合信息栏
- ✅ RecentMints 实时铸造活动流
- ✅ MintSuccess 铸造成功弹窗（含 Twitter 分享）
- ✅ ErrorBoundary 全局错误边界
- ✅ LoadingSkeleton 加载骨架屏
- ✅ 404 页面
- ✅ merkle.ts / signature.ts 重写为 viem 兼容
- ✅ 链配置修正为 Sepolia（11155111）
- ✅ Footer / manifest / OG 品牌更新
- ✅ CSS 动画 + 移动端安全区域 + 无障碍焦点样式 + prefers-reduced-motion
- ✅ GasEstimate 集成到所有 5 种铸造模式
- ✅ 输入验证（数量、Merkle Proof、签名截止时间）
- ✅ 区块浏览器链接动态化（支持多链）
- ✅ 路由级 loading.tsx 骨架屏
- ✅ 管理后台管理员权限检查
- ✅ LoadingSkeleton 组件实际接入（不再是死代码）
- ✅ 交易状态流修正（pending → mining → confirmed）
- ✅ 安全修复：`withdraw`/`withdrawToken`/`withdrawSplit` 添加 `nonReentrant`
- ✅ 白名单管理器（CSV 上传 + Root 生成 + Proof 测试）
- ✅ 分级白名单工具（per-wallet quantity，参考 thirdweb）
- ✅ Admin 仪表盘分析增强（独立铸造者、活跃度、人均铸造量）
- ✅ 管理后台确认对话框（Withdraw/Pause 等危险操作需二次确认）
- ✅ 管理后台输入验证（价格非负、BPS 0-10000、地址格式校验、错误高亮）
- ✅ AdminEventLog 事件筛选（All/Mints/Sales/Prices 四种过滤器 + 统计卡片可点击）
- ✅ Footer 动态网络名称（从 useTargetNetwork 获取，不再硬编码 Sepolia）
- ✅ Footer 动态网络名称（从 `useTargetNetwork` 获取，不再硬编码 Sepolia）
- ✅ 所有源文件 prettier 格式化通过
- ✅ Header 导航增强：新增 Collections / My NFTs 链接，移动端品牌 logo 可见
- ✅ 移动端响应式：集合详情页 flex-col 堆叠、stats overflow-x-auto、地址 break-all
- ✅ 硬编码 Etherscan URL 全部替换为动态 `getBlockExplorerTxLink(chainId, txHash)`
- ✅ layout.tsx 添加 `lang="en"` 无障碍属性
- ✅ `menu-compact`（DaisyUI v3）修正为 `menu-sm`（DaisyUI v4）
- ✅ `@account-kit/infra` 导入路径修正为子路径 `@account-kit/infra/enhanced-apis`
- ✅ 合约重构：提取 `_batchMint` 内部函数，6 个铸造函数共享逻辑，消除重复代码
- ✅ 合约重构：提取 `_configureDutchAuction` 内部函数，消除 owner/role 版本重复
- ✅ 合约部署 Gas 降低 5%（4,294,246 → 4,079,909），配置荷兰拍卖 Gas 降低 30%
- ✅ 前端 Bug 修复：`hasAllow` Merkle Root 零值比较修正（70 字符 → 66 字符 bytes32）
- ✅ v11 全面审计：修复 40 个 Bug（合约 13 + 前端 27），含 2 个 CRITICAL 安全漏洞
- ✅ 合约 CRITICAL：Dutch Auction 免费铸造漏洞（`auctionStartTime==0` 未检查）
- ✅ 合约 CRITICAL：CEI 违规（tokenId 更新在 `_safeMint` 之后，重入风险）
- ✅ 合约 HIGH：超额 ETH 退还、`transferOwnership` role 同步、`withdraw` 错误提示
- ✅ 合约重构：`_batchMint` / `_configureDutchAuction` 提取内部函数
- ✅ 合约安全：Feistel 密码替换可预测洗牌、构造函数校验加固
- ✅ 前端 CRITICAL：layout.tsx 空引用崩溃、NFTMintUI bytes32 比较错误
- ✅ 前端 HIGH：admin 权限闪现、tx 状态竞态、BPS 解析崩溃
- ✅ 前端 MEDIUM：所有硬编码链/浏览器 URL 改为动态（ContractInfo/RecentMints/NetworkGuard）
- ✅ 前端 LOW：React key 稳定化、dead code 清理、prettier 格式统一
- ✅ 移除 dead code：FINANCE_ROLE、RevealNotReady、MINT_TYPEHASH、unused imports
- ✅ v12 Phased Claim Conditions：N 阶段售卖系统（参考 thirdweb ClaimCondition）
- ✅ 74 个测试全通过（9 核心 + 20 审计 + 32 Claim + 13 Factory）
- ✅ 合约 ~900 行，36 个事件，7 个自定义错误
- ✅ v13 ERC721A 迁移：批量铸造 Gas 降低 70-90%，`_batchMint` / `_claimMint` 使用原生 `_mint(to, qty)`
- ✅ v14 Factory Clone：`NFTLaunchpadKitFactory.sol` 使用 ERC-1167 最小代理，部署 Gas 降低 93%，74 个测试全通过
- ✅ v15 Gas 优化：全部 `require` 字符串替换为 32 个自定义错误，`unchecked` 安全算术，部署 Gas 降低 4.9%（5,165,738）
- ✅ v16 Slither 静态分析：claim() CEI 修复、setAcceptedToken/setTrustedSigner 零地址检查，39 项均为可接受/误报

**未解决：**

1. **合约地址是占位符** — `deployedContracts.ts` 中 `0x0000...`，所有读写调用无效
2. **无真实图片资源** — 使用 scaffold 默认 logo
3. **无移动端响应式测试** — 未在真机上验证体验

---

## 五、部署指南

### 5.1 前置条件

- Node.js >= 18.18.0
- Alchemy API Key
- Sepolia 测试网 ETH（从水龙头获取）
- 部署者钱包私钥

### 5.2 步骤

```bash
# 1. 配置环境变量
cd scaffold-alchemy-main
# 编辑根目录 .env，填入 PRIVATE_KEY、ALCHEMY_API_KEY、ETHERSCAN_API_KEY

# 2. 安装依赖
yarn install

# 3. 编译合约
yarn compile

# 4. 运行测试
yarn test

# 5. 部署到 Sepolia
yarn deploy:final

# 6. 验证合约（部署后自动或手动）
yarn verify

# 7. 更新前端合约地址
# 部署成功后，scripts/generateTsAbis.ts 会自动更新 deployedContracts.ts
# 如果没有自动更新，手动将合约地址填入

# 8. 启动前端
yarn start
# 访问 http://localhost:56900
```

### 5.3 部署后配置

部署完成后，需要通过管理后台或直接调用合约配置：

1. 设置白名单 Merkle Root
2. 配置荷兰拍卖参数（可选）
3. 设置可信签名者（可选）
4. 配置 ERC20 代币支付（可选）
5. 设置版税接收地址和比例
6. 配置分账地址和比例
7. 设置 Base URI（元数据地址）
8. 开启售卖

---

## 六、后续工作

### P0 — 上线前必须完成

- [ ] 部署合约到 Sepolia 测试网
- [ ] 更新 `deployedContracts.ts` 中的真实地址
- [x] 执行 `next build` 验证生产构建 ✅
- [ ] 在测试网完整测试所有铸造流程
- [ ] 使用 Slither 进行静态安全分析

### P1 — 上线后尽快完成

- [ ] 专业安全审计
- [ ] 合约 Etherscan 验证
- [ ] 后端 API：白名单 proof 生成（`utils/merkle.ts` 已就绪）
- [ ] 后端 API：签名铸造签名服务（`utils/signature.ts` 已就绪）
- [ ] 品牌设计：Logo、配色、字体
- [x] 错误边界 ✅（`ErrorBoundary` 组件，集成到 layout）
- [x] 加载骨架屏 ✅（`LoadingSkeleton` 组件）
- [x] 网络守卫 ✅（`NetworkGuard` 组件，检测错误链 + 切换 Sepolia）
- [x] 合约信息面板 ✅（`ContractInfo` 组件，地址/所有者/Etherscan/部署状态）
- [x] 交易状态指示器 ✅（`TxStatus` 组件，pending/mining/confirmed/failed）
- [x] Gas 估算 ✅（`GasEstimate` 组件，已集成到所有 5 种铸造模式）
- [x] 集合信息栏 ✅（`CollectionStats` 组件）
- [x] 实时铸造活动流 ✅（`RecentMints` 组件）
- [x] 铸造成功弹窗 ✅（`MintSuccess` 组件，含 Twitter 分享）
- [x] 404 页面 ✅（`app/not-found.tsx`）
- [x] Gas 估算集成 ✅（所有 5 种铸造模式显示预估 Gas 费）
- [x] 输入验证 ✅（数量 step/onBlur、Merkle Proof 自动修正、签名时间纯数字）
- [x] 区块浏览器链接动态化 ✅（`getBlockExplorerTxLink` 替代硬编码）
- [x] 路由级 loading 骨架屏 ✅（`/` → MintSkeleton、`/admin` → 管理后台骨架）
- [x] 管理员权限检查 ✅（`hasRole(DEFAULT_ADMIN_ROLE)` 非管理员拒绝页面）
- [x] 无障碍 motion ✅（`prefers-reduced-motion` 媒体查询）
- [x] 白名单管理 UI ✅（`WhitelistManager` 组件，CSV→Root→Proof 测试）
- [x] 分级白名单工具 ✅（`merkle.ts` 支持 per-wallet quantity）
- [x] Admin 分析增强 ✅（独立铸造者、活跃度、人均铸造量、USD 估值）
- [x] 管理后台确认对话框 ✅（Withdraw/Pause 等危险操作二次确认）
- [x] 管理后台输入验证 ✅（价格/BPS/地址格式校验 + 错误高亮）
- [x] 事件日志筛选 ✅（All/Mints/Sales/Prices 过滤器 + 统计卡片可点击）
- [x] Footer 动态网络名 ✅（从 useTargetNetwork 获取，不再硬编码）
- [x] 移动端响应式优化 ✅ 集合详情页堆叠布局、stats 横向滚动、地址 break-all、Header 移动端品牌可见

### P2 — 后续迭代（详见第七章架构分析）

- [x] Phased Claim Conditions（多阶段售卖，参考 thirdweb）✅
- [x] Per-Wallet Merkle Quantity 合约层支持 ✅ `claimWithPerWalletQty()` + (address, maxQty) 叶子格式
- [x] ERC721A 批量铸造优化（Gas 降低 70-90%）✅
- [x] Factory Clone 部署模式（部署 Gas 降低 93%，`NFTLaunchpadKitFactory.sol` + `Clones.clone()`）
- [x] The Graph 子图（链上数据索引）✅ 27 事件 + 9 实体 + Factory Clone 动态数据源
- [ ] 多签钱包（Gnosis Safe）— 见 7.6 节集成指南
- [ ] 多链部署 — 见 7.7 节部署模式
- [x] Signature Mint UID 去重 ✅ V2 签名函数 + per-signature pricing + usedSignatures mapping
- [x] 延迟揭示（AES 加密元数据）✅ AES-256-CTR + Feistel 揭示共存
- [x] NFT 展示画廊 ✅ tokenURI → IPFS 元数据 → 图片渲染（`NFTTokenCard`）
- [x] 社交分享功能 ✅ Twitter + Telegram + 复制 Tx Hash（v26）

---

## 七、架构分析与生产级路线图

### 7.1 与主流 NFT 平台对比

参考 thirdweb、Manifold、Sound Protocol、ERC721A (Azuki) 等开源项目：

| 维度 | thirdweb | Manifold | 本项目 | 差距评估 |
|------|----------|----------|--------|----------|
| **Token 基础** | ERC721A | ERC721/1155 | ERC721A | ✅ 已对齐 |
| **铸造模型** | Lazy Mint + Claim | Extension-based | Direct Mint | 可选优化 |
| **售卖阶段** | N 阶段 ClaimCondition | 单阶段 | N 阶段 ClaimCondition | ✅ 已对齐 |
| **白名单** | 每阶段独立 Merkle Root | 扩展注册 | 每阶段独立 Merkle Root | ✅ 已对齐 |
| **签名铸造** | EIP-712 + UID + 有效期 | N/A | EIP-712 + UID + per-signature pricing | ✅ 已对齐 |
| **揭示** | AES 加密延迟揭示 | TokenURIResolver | Commit-Reveal + Shuffle | 可选增强 |
| **部署模式** | Factory Clone | Registry + Extension | 单合约部署 | 需升级（可选） |
| **索引** | Dashboard API + Events | Subgraph | The Graph Subgraph | ✅ 已对齐 |
| **后端 API** | 全功能 REST API | Studio API | 9 端点（签名/Proof/CRUD/分析） | ✅ 已对齐 |
| **管理后台** | 全功能 Dashboard | Studio UI | 8 面板 + 图表 + RBAC | ✅ 已对齐 |
| **多链** | Chain-agnostic ABIs | 单链 | 单链 | 可选增强 |

### 7.2 当前架构的优势

1. **6 种铸造模式** — 公开、白名单、荷兰拍卖、签名(传统)、签名(EIP-712)、ERC20，覆盖面广
2. **39 个事件** — 完整的链下索引基础，支持 The Graph 子图
3. **RBAC 权限** — AccessControl 三角色分级（Admin/Operator/Finance）
4. **安全机制** — ReentrancyGuard + Pausable + EIP-712 域分隔 + 延迟揭示
5. **viem 原生** — 前端完全使用 viem，无 ethers 依赖
6. **白名单管理** — CSV 上传 → Merkle Root 生成 → Proof 测试，完整流程
7. **输入验证** — 数量、Proof、签名时间等全链路验证
8. **无障碍** — prefers-reduced-motion、focus-visible、语义化 HTML
9. **延迟揭示** — AES-256-CTR 加密元数据 URI，支持与 Feistel 揭示共存
10. **品牌视觉** — 自定义 SVG logo + favicon + Hero 营销区 + JSON-LD 结构化数据
11. **NFT 画廊** — My NFTs 页面通过 tokenURI 解析 IPFS 元数据，展示实际 NFT 图片
12. **后端 API** — 签名铸造 + 白名单 Proof 自动生成，前后端完整闭环
13. **集合管理** — 搜索/排序/分页 + Admin 多集合选择器

### 7.3 生产级路线图（按优先级排序）

#### P0 — 部署前必须完成

- [ ] 部署合约到 Sepolia 测试网
- [ ] 更新 `deployedContracts.ts` 中的真实地址
- [ ] 在测试网完整测试所有铸造流程
- [ ] 使用 Slither/Mythril 进行静态安全分析

#### P1 — 高优先级架构升级

| 升级项 | 说明 | 复杂度 | 参考 |
|--------|------|--------|------|
| **Phased Claim Conditions** | ✅ 已完成。N 阶段数组，每阶段独立价格/供应/时限/白名单/ERC20 支付 | ✅ | thirdweb `Drop.sol` |
| **Per-Wallet Merkle Quantity** | ✅ 已完成。`claimWithPerWalletQty()` + `keccak256(address, maxQty)` 叶子格式 | ✅ | thirdweb ClaimCondition |
| **Admin Merkle 管理 UI** | CSV 上传 → 生成 Root → 一键设置（✅ 已完成） | ✅ | thirdweb Dashboard |

#### P2 — 中优先级功能增强

| 升级项 | 说明 | 复杂度 | 参考 |
|--------|------|--------|------|
| **ERC721A 批量铸造** | 替换 ERC721 基础，批量铸造 Gas 降低 70-90% | 高 | chiru-labs/ERC721A |
| **Factory Clone 部署** | 使用 `Clones.clone()` 降低部署 Gas 90%，支持多集合 | 中 | Zora Creator |
| **Signature Mint UID** | 每个签名有唯一 ID，防止重放，支持每签名独立价格 | 低 | thirdweb SignatureMint |
| **延迟揭示（加密）** | ✅ 已完成。AES-256-CTR 加密元数据 URI 存链上，支持与 Feistel 揭示共存 | ✅ | thirdweb IDelayedReveal |
| **The Graph 子图** | 索引 29 个事件，支持高效历史查询和分析 | 中 | Sound Protocol |

#### P3 — 低优先级 / 长期

| 升级项 | 说明 | 复杂度 | 参考 |
|--------|------|--------|------|
| **插件/扩展架构** | 核心合约 + 可注册扩展（空投、销毁兑换等） | 高 | Manifold Creator |
| **ERC721C 版税执行** | TransferValidator 钩子阻止不付版税的市场交易 | 高 | Limit Break |
| **多链部署** | Factory 模式 + Chain-aware ABI | 中 | scaffold-eth-2 |
| **链上元数据层** | 动态 SVG、属性存储、Token-Bound 数据 | 中 | On-chain SVG |
| **管理后台分析** | ✅ 已完成。每日柱状图、铸造模式环形图、累计折线图（纯 CSS/SVG，零依赖） | ✅ | thirdweb Dashboard |

### 7.4 Phased Claim Conditions 设计草案（✅ 已实现，见 3.3 节）

参考 thirdweb 的 `ClaimCondition` 结构，已实现：

```solidity
struct ClaimCondition {
    uint256 startTimestamp;      // 阶段开始时间
    uint256 maxClaimableSupply;  // 本阶段最大可铸造量
    uint256 supplyClaimed;       // 本阶段已铸造量
    uint256 quantityLimitPerWallet; // 每钱包限额
    uint256 pricePerToken;       // 本阶段价格
    address currency;            // 支付代币（address(0)=ETH）
    bytes32 merkleRoot;          // 本阶段白名单根
    string metadata;             // 阶段描述（链下用）
}

ClaimCondition[] public claimConditions;
uint256 public currentClaimPhase;
```

这样可以支持：Discord OG → Twitter WL → Early Bird → Public，每阶段独立配置。

### 7.6 多签钱包集成指南（Gnosis Safe）

**为什么需要多签？**
- 合约 owner 是单个 EOA → 私钥泄露 = 全部资金/控制权丢失
- 多签要求 M-of-N 签名才能执行管理操作，大幅提升安全性

**集成方案：**

1. **部署 Gnosis Safe**：在目标链上创建 Safe（推荐 2/3 或 3/5 配置）
2. **转移合约 ownership**：调用 `transferOwnership(safeAddress)`，合约会自动同步 `DEFAULT_ADMIN_ROLE`
3. **通过 Safe 执行管理操作**：所有 `onlyOwner` 函数（setSaleState、setMintPrice、withdraw 等）通过 Safe App 发起交易
4. **Operator 角色分离**：日常运营（开关销售）用 `OPERATOR_ROLE`，不需要过 Safe，降低操作摩擦

**注意事项：**
- Safe 交易需要多个签名者确认，紧急暂停（pause）可能有延迟
- 建议：Owner = Safe（冷操作），Operator = EOA（热操作）
- Safe 支持移动端签名，体验优于纯 CLI 多签

**参考：**
- Gnosis Safe Docs：docs.safe.global
- Safe{Core} SDK：github.com/safe-global/safe-core-sdk

### 7.7 多链部署模式

**架构方案：Factory + 链感知 ABI**

```
部署流程：
1. 在每条目标链部署 NFTLaunchpadKitFactory
2. 通过 Factory.deployCollection() 创建集合（Clone 模式）
3. deployedContracts.ts 按 chainId 索引合约地址
4. scaffoldConfig.targetNetworks 配置支持的链
```

**具体步骤：**

1. **scaffold.config.ts 添加多链**：
   ```typescript
   targetNetworks: [sepolia, baseSepolia, arbitrumSepolia]
   ```

2. **deployedContracts.ts 多链地址**：
   ```typescript
   const deployedContracts = {
     11155111: { NFTLaunchpadKit: { address: "0x...", ... } },
     84532:    { NFTLaunchpadKit: { address: "0x...", ... } },
     421614:   { NFTLaunchpadKit: { address: "0x...", ... } },
   }
   ```

3. **前端自动适配**：`useChainId()` + `deployedContracts[chainId]` 已内置支持
4. **子图多链部署**：每条链独立部署子图，或使用 Subgraph Studio 多链版本
5. **Etherscan 验证**：每条链需要对应的 API Key（Etherscan/Arbiscan/Basescan）

**推荐测试网：**
| 链 | 测试网 | Chain ID | 水龙头 |
|----|--------|----------|--------|
| Ethereum | Sepolia | 11155111 | sepoliafaucet.com |
| Base | Base Sepolia | 84532 | coinbase.com/faucets |
| Arbitrum | Arbitrum Sepolia | 421614 | faucet.quicknode.com |

### 7.8 Etherscan 合约验证指南

**前置条件：**
1. 注册 Etherscan 账号 → 获取 API Key
2. 设置环境变量：`ETHERSCAN_API_KEY=your_key`

**验证命令：**
```bash
# 验证 NFTLaunchpadKit
yarn hardhat verify --network sepolia <CONTRACT_ADDRESS> <constructor_args...>

# 或使用项目脚本
yarn verify:sepolia
```

**构造函数参数（按顺序）：**
1. `_initialOwner` — 部署者地址
2. `_mintPrice` — 铸造价格（wei），如 `10000000000000000`（0.01 ETH）
3. `_maxSupply` — 最大供应量，如 `10000`
4. `_maxPerWallet` — 每钱包限购，如 `5`

**Factory 合约验证：**
```bash
yarn hardhat verify --network sepolia <FACTORY_ADDRESS> <IMPLEMENTATION_ADDRESS>
```

**验证后效果：**
- Etherscan 页面显示绿色勾 ✅
- 用户可以直接在 Etherscan 上读写合约
- 提升项目可信度

**多链验证：**
每条链需要对应的 API Key 环境变量：
- Ethereum: `ETHERSCAN_API_KEY`
- Base: `BASESCAN_API_KEY`
- Arbitrum: `ARBISCAN_API_KEY`

### 7.5 技术参考资源

| 资源 | 链接 | 用途 |
|------|------|------|
| thirdweb Contracts | github.com/thirdweb-dev/contracts | ClaimCondition、LazyMint、SignatureMint |
| ERC721A | github.com/chiru-labs/ERC721A | Gas 优化批量铸造 |
| Manifold Creator | github.com/manifoldxyz/creator-core-contracts | 扩展/插件架构 |
| Sound Protocol | github.com/soundxyz/protocol | Factory 模式、Minter 分离 |
| scaffold-eth-2 | github.com/scaffold-eth/scaffold-eth-2 | 前端 Hook 模式、多链配置 |

---

## 八、常见问题

**Q: 本地不填 API Key 能跑吗？**
A: 能。本地用 Hardhat 内置链，不需要外部 RPC。部署测试网才需要。

**Q: 白名单 proof 怎么生成？**
A: 用 `utils/merkle.ts`（基于 merkletreejs + viem），调用 `generateMerkleTree(addresses)` 生成树，`getProof(tree, address)` 生成 proof。后端 API 可直接使用。

**Q: 合约能升级吗？**
A: 不能。当前没有代理模式。需要升级就部署新合约。

**Q: 分账比例为什么等于 10000？**
A: BPS（基点），10000 = 100%，整数计算避免浮点精度问题。

**Q: 签名铸造怎么用？**
A: 后端用 `utils/signature.ts` 的 `signMintAuth712(account, params)` 生成签名，前端把签名传给合约的 `mintWithSignature712()`。需要先设置可信签名者 `setTrustedSigner()`。

**Q: 本地测试怎么跑？**
A: `yarn chain` 启动本地链 → `yarn deploy` 部署合约 → `yarn start` 启动前端。合约地址会自动写入 `deployedContracts.ts`（chain 31337）。
