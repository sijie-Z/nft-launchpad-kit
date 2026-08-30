# @nft-launchpad-kit/sdk

**The agent issues. The user mints.**

A TypeScript SDK for agent-native NFT issuance. Give your agent a wallet and
it can create collections, sign one-time mint grants, generate metadata, and
execute mints — through three levels of API:

| Level | Methods | For |
|-------|---------|-----|
| **1 · Goal** | `collections.create` · `grants.issue` · `metadata.generate` · `mint.execute` | agents (default) |
| **2 · Resource** | `collections.get/list` · `grants.verify` · `agents.get` | queries |
| **3 · Primitive** | `collections.deploy` · `collections.register` | advanced control |

## Install

```bash
npm install @nft-launchpad-kit/sdk
```

Requires a running [NFT Launchpad Kit](https://github.com/sijie-Z/nft-launchpad-kit)
instance (the platform provides the signing service, agent registry and
metadata pipeline).

## 10-minute first issuance

```ts
import { LaunchpadKit } from "@nft-launchpad-kit/sdk";
import { privateKeyToAccount } from "viem/accounts";

const kit = new LaunchpadKit({
  baseUrl: "https://your-instance.example.com", // your platform instance
  apiKey: process.env.NLA_API_KEY,              // platform API key
  chain: "base-sepolia",
  wallet: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY!), // your agent's key
});

// 1. Register the agent's identity (audit trail)
await kit.agents.register({
  address: kit.config.wallet.address,
  name: "QuestRewardBot",
  capabilities: ["mint", "membership"],
});

// 2. Create a collection — one call: deploy via Factory + trust the signer + register
const signer = await kit.grants.getSigner();
const collection = await kit.collections.create(
  { name: "AI Founder Pass", symbol: "AFP", supply: 1000, price: "0.01" },
  { trustedSigner: signer },
);

// 3. Issue a one-time mint grant for a user
const grant = await kit.grants.issue({
  collectionAddress: collection.contractAddress!,
  minter: userAddress,
  quantity: 1,
  agentAddress: kit.config.wallet.address,
});

// 4. The user mints (the wallet pays the mint price + gas)
await kit.mint.execute({ collectionAddress: collection.contractAddress!, grant });

// 5. Verify: the grant's UID is burned — replay reverts on-chain
const used = await kit.grants.verify(collection.contractAddress!, grant.uid);
```

That's it: **create → issue → mint**. The contract verifies the signature
on-chain (trusted signer, deadline, one-time UID) before minting anything.

## Concepts (30 seconds)

- **Agent** = any program holding a private key. The contract's
  `trustedSigner` is the only address whose signatures can authorize mints.
- **Grant** = an off-chain signature (`{minter, quantity, maxMint, deadline,
  pricePerToken, uid}`), one-time via UID, expiring via deadline.
- **Collection** = an ERC-721A collection deployed as a minimal-proxy clone
  (~371k gas) — the platform's Factory handles it.

## Local demo (dogfood)

See [`examples/agent-issuance.ts`](examples/agent-issuance.ts) — runs the full
loop against a local Hardhat chain + a local platform server (three terminals,
instructions in the file header).

## Supported chains

`sepolia` (11155111) · `base-sepolia` (84532, after the Factory is deployed) ·
`localhost` (31337, for the local demo).

## License

MIT
