import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@nomicfoundation/hardhat-verify";

const privateKey = process.env.PRIVATE_KEY;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;

// 支持多种配置格式；最后兜底公共 RPC（无任何 key 也能部署测试网）
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL
  || alchemyRpcUrl
  || (alchemyApiKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}` : "")
  || "https://ethereum-sepolia.publicnode.com";

// Base Sepolia (#37) — agent economy's home turf; Alchemy supports it by default.
const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL
  || (alchemyApiKey ? `https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}` : "")
  || "https://sepolia.base.org";

if (!privateKey) {
  console.warn("PRIVATE_KEY not found in .env file. Deploy to testnet will not work.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: privateKey ? [privateKey] : [],
      chainId: 11155111,
    },
    baseSepolia: {
      url: baseSepoliaRpcUrl,
      accounts: privateKey ? [privateKey] : [],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: etherscanApiKey || "",
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
  },
  gasReporter: {
    // Local: `yarn hardhat:test` sets REPORT_GAS=true → report printed.
    // CI: GitHub Actions always sets CI=true → disabled to keep the pipeline fast.
    enabled: process.env.REPORT_GAS === "true" && process.env.CI !== "true",
  },
};

export default config;