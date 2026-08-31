# 平台实例托管方案（池 A/B 测试用）

> 池 A/B 测试需要一个**公开可访问的平台实例**（baseUrl），陌生人才能连。
> 三个方案，按"现在就能用"排序。

---

## ⚠️ 先说明：为什么不能直接上 Vercel

项目用 **Prisma + SQLite**。Vercel 的 serverless 函数是**临时环境** —— SQLite 文件每次调用都可能重置/只读，导致：
- 集合/agent 注册记录丢失（SDK 的 `collections.get` 会 404）
- 测试中断

**结论**：Vercel 要等数据库改造（Turso/D1 + Prisma driver adapter）之后才合适。**现在不走这条路。**

---

## 方案 1：本机 + ngrok（零成本，10 分钟上线，推荐先跑）

适合：池 A 前几轮（作者陪跑）、快速验证。

1. 本机启动平台（三个终端）：
   ```bash
   # 终端 1：本地链
   cd scaffold-alchemy-main/packages/hardhat && npx hardhat node
   # 终端 2：部署合约 + 启动平台（SIGNER_PRIVATE_KEY 用部署者私钥）
   cd scaffold-alchemy-main && npx hardhat deploy --network localhost
   SIGNER_PRIVATE_KEY=<部署者私钥> DATABASE_URL="file:./dev.db" yarn workspace @scaffold-alchemy/nextjs dev
   # 终端 3：暴露公网
   npx ngrok http 56900
   ```
2. ngrok 会给出一个 `https://xxxx.ngrok-free.app` 地址 —— 这就是测试者的 baseUrl
3. 注意：本机需要保持开机；ngrok 免费版 URL 每次重启会变（测试前重新发）

**问题**：SDK 的 `collections.deploy` 走链上（需要 Sepolia 的 Factory）—— 所以**链上部分用 Sepolia**（#15 部署后），API 部分用 ngrok 本机实例。两个拼起来 = 完整测试环境。

---

## 方案 2：VPS / 云服务器（正式方案，推荐）

国内云厂商轻量服务器（阿里云/腾讯云，约 ¥30-50/月 或学生优惠）：

1. 服务器装 Node 20 + yarn
2. 拉代码：`git clone https://github.com/sijie-Z/nft-launchpad-kit.git`
3. 启动（pm2 守护）：
   ```bash
   cd scaffold-alchemy-main && yarn install
   DATABASE_URL="file:./prod.db" SIGNER_PRIVATE_KEY=<key> ALCHEMY_API_KEY=<key> \
     yarn workspace @scaffold-alchemy/nextjs start  # 需先 build
   ```
4. Nginx 反代 56900 → 443 + HTTPS 证书（acme.sh/宝塔面板）
5. 固定 URL，测试者随时可用

**优点**：SQLite 持久、稳定、正式。**缺点**：要买服务器 + 配 HTTPS。

---

## 方案 3：Vercel（数据库改造后）

改 Prisma 到托管 SQLite（Turso / Cloudflare D1 + driver adapter），然后 vercel.json 已就绪可直接部署。适合池 A/B 验证跑通后的"正式发布"阶段。

---

## 测试环境拼装图（池 A 用）

```
陌生人（npm install SDK）
   │
   ├─ 链上操作（create/mint）→ Sepolia（#15 部署的 Factory + 合约）
   └─ API 操作（register/issue/metadata）→ 平台实例（ngrok 或 VPS）
```

**前置**：#15 部署验证（配 4 个 Secrets）→ Sepolia Factory 真实地址 → SDK 的 `chain: "sepolia"` 路径可用。
