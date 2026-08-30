# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added (post-v1.0.0 ideas)

- Marketplace / post-mint liquidity layer (STRATEGY.md: the L2→L3 lever)
- Token (ERC-20) issuance alongside NFTs

## [1.0.0] - 2026-08-30

### Added

- **Smart contracts** (`packages/hardhat`)
  - `NFTLaunchpadKit` — 6 mint modes (public, allowlist, Dutch auction,
    signature legacy + EIP-712, ERC20, phased claim conditions), Factory
    Clone (ERC-1167), EIP-2981 royalties, delayed reveal, Feistel tokenURI
    shuffle (bijective via cycle-walking), 28 custom errors, 37 events
  - `NFTLaunchpadKitFactory` — clone deploys (93% gas savings), CREATE2
    deterministic deploys with caller-bound salts (front-run resistant)
  - 100 tests incl. exhaustive bijectivity checks; Slither-reviewed
- **Creator product layer** (M4)
  - No-code collection wizard (admin 🚀 tab): deploy via Factory → register
    → guided setup
  - AI metadata pipeline: generate + pin 1000 token metadata files in ONE
    IPFS request (`/api/metadata/generate`)
  - Agent identity registry + grant audit trail (`Agent`/`AgentGrant`,
    wired into `/api/signature`)
  - Runnable agent-native issuance example (`examples/agent`) + 10-min guide
- **Infrastructure**
  - CI: contract tests + frontend type/test/lint in parallel (~3–4 min),
    real `next build` on merge, manual multi-network deploy workflow
  - Multi-chain: Sepolia + Base Sepolia (one-command deploys)
  - English docs: README + 3 tutorials (create / agent mint / multichain)

### Fixed

- Hardcoded Alchemy API keys removed from the repo (rotate them!)
- `next build` actually passes (prisma generate postinstall; removed the
  `IGNORE_BUILD_ERROR` escape hatch)
- Feistel shuffle non-bijectivity → tokenURI collisions (cycle-walking fix)
- Payout split mode could not be cleared / dust could never be recovered
- CREATE2 salt front-running (caller-bound salts)
- hardhat `check-types` clean (13 → 0 errors); dead code removed (AA deploy
  chain, unused errors, unused deps)
- npm/yarn dual lockfiles (yarn is the single source of truth)
- Test hygiene: `restoreAllMocks()` vs `vi.fn()` call-history leak

### Security

- Slither 0.11.6: 44 findings, all acceptable/benign after fixes
- Mainnet deployment requires a professional audit (see PROJECT.md)
