# NFT Launchpad Kit — Agent-Native Issuance Infrastructure

> **The agent issues. The user mints.**
> Give any AI agent a key and it can create collections, sign mint grants,
> and issue on-chain assets (memberships, rewards, credentials, NFTs) —
> fully automated, fully verifiable.

Solidity (Hardhat) + Next.js 14 monorepo. 6 mint modes + Factory Clone + no-code
creator wizard + AI metadata pipeline + admin dashboard + The Graph subgraph.

---

## Why this exists

Classic launchpads mint NFTs for humans. This kit's contracts contain a
primitive that works for **programs**: the trusted-signer flow
(`mintWithSignature712V2`) — an off-chain signature from a registered address
authorizes an on-chain mint, one-time (UID), expiring (deadline), scoped
(quantity, price). The "signer" doesn't have to be a person.

**An AI agent holding a key can issue assets on demand**: quest rewards after
a webhook fires, membership cards per purchase, gated access by deadline,
credentials with per-signature pricing. The on-chain half is tamper-evident;
the off-chain half is auditable via the agent registry.

## Features

**Mint modes**

- Public mint (fixed price + per-wallet limit)
- Allowlist mint (Merkle proof)
- Dutch auction (linearly decreasing price)
- Signature mint (legacy + EIP-712, UID-based V2 with per-grant pricing)
- ERC20 payment mint
- Phased Claim Conditions (N-phase drops, per-phase price/supply/allowlist)

**Contract engineering**

- ERC721A batch mint (70–90% gas savings)
- ERC-1167 minimal-proxy Clone (93% cheaper deploys via Factory)
- EIP-2981 royalties · EIP-712 domain separation · nonce + UID replay protection
- SafeERC20 · ReentrancyGuard · Pausable · AccessControl
- 28 custom errors (zero string requires) · 37 events (indexing-ready)
- Feistel-based **bijective** tokenURI shuffle (cycle-walking, no collisions)

**Product layer (M4)**

- 🚀 **No-code creator wizard** — deploy a collection via the Factory in 4 steps
- ⚡ **AI metadata pipeline** — generate + pin 1000 token metadata files in ONE
  IPFS request (`ipfs://<cid>/` as Base URI)
- 🤖 **Agent identity registry** — agents register, every issuance is audited
  (`Agent` + `AgentGrant` records wired into `/api/signature`)
- Admin dashboard (8 panels + analytics) · Whitelist manager (CSV → Merkle root)
- Real-time mint feed · tx status · gas estimates

## Quick start

```bash
cd scaffold-alchemy-main
yarn install            # yarn 3; runs prisma generate automatically

yarn hardhat:test       # 100 contract tests
yarn workspace @scaffold-alchemy/nextjs test          # 104 frontend tests
yarn workspace @scaffold-alchemy/nextjs check-types   # typecheck
yarn workspace @scaffold-alchemy/nextjs dev           # dev server :56900
```

Environment: copy `.env.example` to `.env` and fill in keys. Never commit
secrets — env vars and GitHub Secrets only.

## Tutorials (30-minute path: "my agent issues a collection")

| Tutorial | What you'll do |
|----------|----------------|
| [Create a collection, no code](docs/tutorial-create-collection.md) | Run the wizard: deploy via Factory + register + publish |
| [Agent-native minting](docs/tutorial-agent-minting.md) | An agent creates a collection and signs mint grants — runnable example in [`examples/agent`](scaffold-alchemy-main/examples/agent) |
| [Deploy to Sepolia & Base](docs/tutorial-multichain.md) | One command per network, verify on Etherscan/Basescan |

## Tests

| Suite | Count | Command |
|-------|-------|---------|
| Contracts (Hardhat) | 100 | `yarn hardhat:test` |
| Frontend (Vitest) | 104 | `yarn workspace @scaffold-alchemy/nextjs test` |

Gas baselines: [`GAS_BASELINE.md`](scaffold-alchemy-main/GAS_BASELINE.md) ·
Frontend baselines: [`TEST_BASELINE.md`](scaffold-alchemy-main/TEST_BASELINE.md)

## CI (GitHub Actions)

- `ci.yml` — PRs: contract tests + frontend type/test/lint in parallel, **~3–4 min**
- `build.yml` — real `next build` on every merge to main/develop
- `deploy.yml` — manual Sepolia/Base deploys with GitHub Secrets

## Branch model

- `main` — releases only (develop → main PR, tagged)
- `develop` — day-to-day integration; feature branches PR into it
- See `scaffold-alchemy-main/CONTRIBUTING.md`

## Multi-chain

Sepolia (default) and **Base Sepolia** supported:

```bash
yarn deploy:final      # Sepolia
yarn deploy:base       # Base Sepolia — the agent economy's home
```

## Security

ReentrancyGuard on every payable path · CEI ordering · excess-ETH refunds ·
signature nonce/UID replay protection · zero-address checks · clone
initialization guards · Slither-reviewed · bijective reveal shuffle.
> Mainnet deployment requires a professional audit (see `PROJECT.md`).

## Tech stack

| Layer | Stack |
|-------|-------|
| Contracts | Solidity 0.8.28 · ERC721A · OpenZeppelin 5 · Hardhat |
| Frontend | Next.js 14 · viem · wagmi · Tailwind + DaisyUI |
| Backend | Next.js API routes · Prisma 5 · SQLite |
| Indexing | The Graph subgraph |

## License

MIT
