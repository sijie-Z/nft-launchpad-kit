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

// 支持多种配置格式
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL
  || alchemyRpcUrl
  || (alchemyApiKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}` : "");

if (!privateKey) {
  console.warn("PRIVATE_KEY not found in .env file. Deploy to testnet will not work.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true,
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
  },
  etherscan: {
    apiKey: {
      sepolia: etherscanApiKey || "",
    },
  },
};

export default config;