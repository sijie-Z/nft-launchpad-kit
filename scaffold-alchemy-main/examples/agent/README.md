# 🤖 Agent-Native Issuance — 10-Minute Guide

> **The agent issues. The user mints.** Your AI agent can create collections,
> sign mint grants, and hand them to users — fully automated, fully on-chain.

This guide takes you from zero to "my agent issued a membership card" in about
10 minutes. No crypto background needed — everything you must understand is
explained inline.

---

## What you're building

Your agent (any program holding a key — a scheduler, a webhook, an LLM tool
call, a game server) will:

1. **Create a collection** (one transaction, ~2 seconds)
2. **Become the trusted signer** (only its signatures can authorize mints)
3. **Sign a mint grant** for a user (EIP-712, one-time UID, expiring)
4. **User mints** with that grant — no approvals, no lists, no backend

The result: **agent-driven issuance** — membership cards, quest rewards,
gated access, credentials, coupons. Minted on demand, verifiable by anyone.

```
┌─────────┐  deployCollection()  ┌──────────────┐
│  AGENT  │ ───────────────────► │  Collection  │
│ (key)   │  setTrustedSigner()  │  (contract)  │
└────┬────┘ ───────────────────► └──────┬───────┘
     │  signTypedData() (off-chain)     │ verifies sig on-chain
     ▼                                  ▼
  grant (sig + uid) ────────────────► mintWithSignature712V2()
                                       ▲
                            user (wallet) pays + gets NFT
```

---

## Prereqs

- Node.js ≥ 18
- This repo, with the workspace installed once:
  ```bash
  cd scaffold-alchemy-main
  yarn install
  ```

## Run it (3 terminal commands)

```bash
# 1. Start a local blockchain (Hardhat)
cd packages/hardhat
npx hardhat node

# 2. In a SECOND terminal: deploy the Factory + implementation
cd scaffold-alchemy-main
npx hardhat deploy --network localhost

# 3. In a THIRD terminal: run the agent demo
cd scaffold-alchemy-main/examples/agent
npx tsx agent-issuance.ts
```

You'll see the agent create a collection, sign a grant, and the user mint:

```
[agent]  ✅ collection deployed at 0x… (owner: agent)
[agent]  ✅ trusted signer = agent
[agent]  ✅ grant signed — handing it to the user
[user]   ✅ minted
— summary —
  token #0 owner: 0x…  (user: 0x…)
  grant uid used: true (one-time — reuse will revert)
✅ Agent-native issuance loop completed
```

---

## Reading the code (5 minutes)

Open `agent-issuance.ts`. It's one file, five steps, all [viem](https://viem.sh).

| Step | What happens | The key idea |
|------|-------------|--------------|
| 1 | `deployCollection` on the Factory | One tx creates a full collection via a minimal-proxy clone (~371k gas). The agent becomes its owner. |
| 2 | `setTrustedSigner(agent)` | After this, **only signatures from this agent can authorize mints**. The contract enforces it on-chain. |
| 3 | `agent.signTypedData(...)` | This is the **off-chain** step — no gas, no tx. The agent issues a grant: `{minter, quantity, deadline, price, uid}` signed with EIP-712. The `uid` is a random one-time token so the same grant can never be replayed. |
| 4 | `mintWithSignature712V2(...)` | The user submits the grant + signature. The contract verifies the signer is the trusted agent, the uid is unused, and the deadline hasn't passed — then mints. |
| 5 | verify | `ownerOf(0)` is the user; `isSignatureUsed(uid)` is true (one-time). |

### The one thing to understand: "trusted signer"

Think of it as an **API key for issuing**. The agent's private key is the
secret; its public address is registered in the contract. Anyone can present a
signature, but only signatures that verify against the registered address
mint anything. If you want to rotate agents, call `setTrustedSigner` with the
new address — old signatures stop working instantly.

### Turning this into agent features

- **Quest rewards**: after your game/webhook confirms a task, have the agent
  sign a grant (quantity = reward size) and send it to the player.
- **Membership**: mint a collection per tier; the agent signs one grant per
  purchase; expiry = `deadline`.
- **Credentials**: `metadata`-rich collections + signature grants = verifiable
  certificates issued by a bot.
- **Multi-agent**: one contract, one trusted signer address — give each agent
  its own address and rotate roles with `OPERATOR_ROLE`/ownership as needed.

---

## Going further

- **Real network (Sepolia testnet)**: deploy via `yarn deploy:final` and point
  `RPC_URL` at a Sepolia RPC. Same code, real network.
- **Production**: the same signing flow is exposed as an API —
  `POST /api/signature` (the agent's key lives in `SIGNER_PRIVATE_KEY`),
  rate-limited and validated. Agents can call it like any web service.
- **White-list phases**: see `setAllowlistMerkleRoot` + `mintAllowlist` for
  Merkle-gated drops, and `setClaimConditions` for multi-phase sales.
- **Contract source**: `packages/hardhat/contracts/NFTLaunchpadKit.sol`
  (28 custom errors, 99 tests, Slither-reviewed).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ECONNREFUSED 127.0.0.1:8545` | The Hardhat node isn't running (step 1). |
| `deployments/localhost/…` not found | Run step 2 (deploy) first. |
| `BadSignature` revert | The contract's trusted signer ≠ the signing key. Check step 2 and the `AGENT_PRIVATE_KEY` you set. |
| `SignatureExpired` | Your system clock is ahead of the chain's time, or you waited > 1h. Deadline is `now + 3600`. |

> License: MIT. This example is a demo — for production, read the security
> notes in the repo (mainnet deployment requires a professional audit).
