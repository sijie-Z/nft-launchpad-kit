# Tutorial: Create a Collection, No Code

**Time: ~10 minutes.** You'll deploy a real collection contract via the
Factory (minimal-proxy clone, ~371k gas) using the admin wizard — no
Solidity, no CLI.

## 1. Start the app

```bash
cd scaffold-alchemy-main
yarn workspace @scaffold-alchemy/nextjs dev
```

Open http://localhost:56900/admin and connect your wallet (the wizard runs on
Sepolia or a local chain — see the multichain tutorial for networks).

## 2. Open the creator wizard

In the admin sidebar, pick **🚀 创建集合 (Create Collection)**. This is the
no-code wizard, modeled on the thirdweb dashboard flow:

```
① 基本信息 → ② 链上部署 → ③ 平台注册 → ④ 完成引导
```

## 3. Fill in basic info

- **Name / Symbol** — e.g. "Agent Club" / "AGT"
- **Total supply** — e.g. 1000
- **Per-wallet limit** — e.g. 5
- **Price (ETH)** — e.g. 0.01
- **Cover image** (optional) — paste a URL or upload via IPFS (the button
  calls `/api/ipfs`; without Pinata keys it returns a dev-mode mock CID)

> Tip: open the **⚡ AI 元数据生成** section — paste an image URL with the
> `{id}` placeholder (e.g. `https://cdn.example.com/agents/{id}.png`), pick a
> count, hit **🚀 生成并上传**. The pipeline generates `{id}.json` metadata
> for every token and pins the whole folder in ONE request, returning
> `ipfs://<cid>/` — exactly what the contract's Base URI needs.

## 4. Deploy

Click **下一步：链上部署 →** and **🚀 部署集合**. Your wallet signs one
transaction that calls `Factory.deployCollection(...)`. The contract is a
minimal proxy to the audited implementation — ~371k gas instead of ~5M.

Wait for the receipt; the wizard parses the `CollectionCloned` event and shows
your new contract address.

## 5. Register + guided next steps

**注册到平台 →** persists the collection (name, owner, contract address,
Base URI) in the backend. You're auto-switched to the new collection's admin
panel, with three shortcuts:

- **⚡ Sale Control** — flip the sale on (or set up a whitelist phase first)
- **💰 Royalty** — EIP-2981 receiver and rate
- **📋 Whitelist** — CSV upload → Merkle root → allowlist minting

## Done

Your collection is live: mint page at `/collections/[id]`, admin at the
sidebar. Total time without the optional metadata step: about 5 minutes.

> Local chain? See [the multichain tutorial](tutorial-multichain.md) to deploy
> the Factory on Sepolia/Base first, or run the wizard against a local Hardhat
> node (chainId 31337 has a preconfigured Factory entry).
