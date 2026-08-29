# Tutorial: Deploy to Sepolia & Base

**Time: ~10 minutes.** One command per network, then verify on
Etherscan/Basescan and point the frontend at your contracts.

## Prerequisites

```bash
cd scaffold-alchemy-main
cp .env.example .env
```

Fill in `.env`:

| Variable | Needed for | Where to get it |
|----------|-----------|-----------------|
| `PRIVATE_KEY` | signing deploys | your deployer wallet (without `0x`) |
| `ALCHEMY_API_KEY` | default RPC for both networks | https://dashboard.alchemy.com |
| `ETHERSCAN_API_KEY` | Sepolia verification | https://etherscan.io/myapikey |
| `BASESCAN_API_KEY` | Base verification | https://basescan.org/apis |

Get test ETH: Sepolia — sepoliafaucet.com · Base Sepolia — the Coinbase faucet
or bridge from Sepolia.

## Deploy to Sepolia

```bash
yarn deploy:final
```

Deploys `NFTLaunchpadKit` (implementation) + `NFTLaunchpadKitFactory`.
Verify:

```bash
yarn verify:sepolia      # preconfigured with the known addresses
```

## Deploy to Base Sepolia

```bash
yarn deploy:base         # npx hardhat deploy --network baseSepolia
yarn verify:base         # needs the deployed addresses + BASESCAN_API_KEY
```

The deploy scripts are chain-agnostic — the same Factory + implementation
pattern runs on both networks (deployment order is handled by hardhat-deploy
dependencies).

## Point the frontend at your contracts

`packages/nextjs/contracts/deployedContracts.ts` is indexed by chainId.
The `84532` (Base Sepolia) entry is pre-created; fill in the addresses after
deploying:

```ts
84532: {
  NFTLaunchpadKit: { address: "0x…", abi: [/* from deployments/baseSepolia/NFTLaunchpadKit.json */] },
  NFTLaunchpadKitFactory: { address: "0x…", abi: [/* …Factory.json */] },
},
```

The frontend reads `deployedContracts[chainId]` dynamically — the mint page,
admin wizard and NetworkGuard all adapt once the entry exists. Until then they
gracefully report "Factory not configured" on that network.

## Supported networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Sepolia | 11155111 | `SEPOLIA_RPC_URL` or Alchemy | etherscan.io |
| Base Sepolia | 84532 | `BASE_SEPOLIA_RPC_URL` or Alchemy | basescan.org |

`scaffold.config.ts` lists both (`targetNetworks`); the primary chain follows
`config/chainConfig.json` (Sepolia by default).

## CI deploys (optional)

`.github/workflows/deploy.yml` deploys via GitHub Secrets
(`PRIVATE_KEY` / `ALCHEMY_API_KEY` / `ETHERSCAN_API_KEY`) — set them in the
`sepolia` environment under Settings → Environments, then trigger the
workflow manually. No `.env` needed on the runner.
