# 🏗 Scaffold-Alchemy（本项目工作区）

> 本目录是 NFT Launchpad Kit 的 Yarn 3 工作区（`packages/hardhat` + `packages/nextjs` + `packages/subgraph`）。
> **项目文档见仓库根目录 `README.md`**；开发流程见本目录 `CONTRIBUTING.md`；测试基线见 `TEST_BASELINE.md` / `GAS_BASELINE.md`。
> 下方为 scaffold 模板原始说明（保留备查）。

Scaffold-Alchemy is a fork of the popular starter project [Scaffold-Eth 2](https://scaffoldeth.io/). It is everything you need to build dApps on Ethereum. You can get started immediately NextJS, TypeScript, Hardhat, AccountKit, Enhanced APIs and Subgraphs 🤩

The beauty of Scaffold Alchemy is that you can have lightning fast iteration between your smart contracts and web application code. Make changes to your contracts and immediately you'll have hooks, components and types that recognize these changes.

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v22.0)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-Alchemy, follow the steps below:

1. Install the latest version of Scaffold-Alchemy

```
npx create-web3-dapp
```

2. In a terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to a testnet. You can see the default testnet in `packages/hardhat/hardhat/config.ts`

3. In a second terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

## Documentation

Visit our [docs](https://docs.alchemy.com/docs/scaffold-alchemy) to learn all the technical details and guides of Scaffold-Alchemy.

## Contributing to Scaffold-Alchemy

We welcome contributions to Scaffold-Alchemy!

Please see [CONTRIBUTING.MD](https://github.com/alchemyplatform/scaffold-alchemy/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-Alchemy.
