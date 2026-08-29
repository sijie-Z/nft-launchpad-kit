# Tutorial: Agent-Native Minting

**Time: ~20 minutes.** Your AI agent (any program holding a key — a
scheduler, a webhook handler, an LLM tool call) creates a collection and
issues mint grants. No crypto background required — everything is explained
inline. This is the kit's differentiator: **the signer doesn't have to be a
person.**

## The idea in one diagram

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

## Part 1 — run the demo (10 minutes)

The runnable example lives in [`scaffold-alchemy-main/examples/agent`](../scaffold-alchemy-main/examples/agent)
with its own 10-minute guide ([README](../scaffold-alchemy-main/examples/agent/README.md)).
It walks through the full loop: agent creates a collection → sets itself as
trusted signer → signs a one-time grant → user mints → on-chain verification.

```bash
cd scaffold-alchemy-main/packages/hardhat
npx hardhat node                       # terminal 1: local chain

# terminal 2:
cd scaffold-alchemy-main
npx hardhat deploy --network localhost # deploy Factory + implementation

# terminal 3:
cd scaffold-alchemy-main/examples/agent
npx tsx agent-issuance.ts              # the agent's whole day in one file
```

Expected output ends with:

```
[agent]  ✅ collection deployed at 0x… (owner: agent)
[agent]  ✅ trusted signer = agent
[agent]  ✅ grant signed — handing it to the user
[user]   ✅ minted
✅ Agent-native issuance loop completed
```

## Part 2 — register the agent's identity (5 minutes)

The product layer ([#40](https://github.com/sijie-Z/nft-launchpad-kit/issues/40))
gives agents an identity and makes every issuance auditable. With the dev
server running:

```bash
# 1. Register the agent (its wallet address + capabilities)
curl -X POST http://localhost:56900/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x<agent-address>",
    "name": "QuestRewardBot",
    "description": "Issues quest reward cards",
    "capabilities": ["mint", "membership", "reward"]
  }'

# 2. Issue a grant as that agent (same call the demo signs, but audited)
curl -X POST http://localhost:56900/api/signature \
  -H "Content-Type: application/json" \
  -d '{
    "minter": "0x<user-address>",
    "quantity": 1,
    "maxMint": 5,
    "deadline": <unix-ts-1h-from-now>,
    "pricePerToken": 0,
    "contractAddress": "0x<collection-address>",
    "chainId": 31337,
    "agentAddress": "0x<agent-address>"
  }'
# → { signature, uid, deadline, signer }

# 3. Audit: the grant is recorded against the agent
curl http://localhost:56900/api/agents/<agent-address>
# → { ..., grants: [ { uid, minter, quantity, deadline, ... } ] }
```

The `uid` returned is the same value the contract checks for one-time use —
the on-chain half of the trust trail. Nothing can be issued that isn't
verifiable on-chain and recorded off-chain.

## Turning this into real features

- **Quest rewards** — webhook confirms a task → agent signs a grant → player mints
- **Membership cards** — per purchase, agent signs; expiry = `deadline`
- **Credentials** — signature grants + metadata = verifiable certificates
- **Multi-agent** — one contract, one trusted signer; rotate with
  `setTrustedSigner`, delegate operations with `OPERATOR_ROLE`

## Production notes

- The signing service lives server-side: `/api/signature` with
  `SIGNER_PRIVATE_KEY` (rate-limited, validated). Agents call it like any web
  service.
- Rotating an agent = `setTrustedSigner(newAddress)` — old signatures stop
  working instantly.
- Mainnet deployment requires a professional audit (see `PROJECT.md`).
