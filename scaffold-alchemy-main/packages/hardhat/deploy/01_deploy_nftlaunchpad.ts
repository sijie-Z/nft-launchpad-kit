import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * 部署 NFTLaunchpadKit 合约（企业级标准脚本）
 * 小白解释：用部署者地址做所有者，参数可以从环境变量读取，没填就用安全的默认值。
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const mintPriceEth = process.env.MINT_PRICE_ETH ?? "0.01";
  const maxSupplyStr = process.env.MAX_SUPPLY ?? "10000";
  const maxPerWalletStr = process.env.MAX_PER_WALLET ?? "5";

  const mintPrice = hre.ethers.parseEther(mintPriceEth);
  const maxSupply = Number(maxSupplyStr);
  const maxPerWallet = Number(maxPerWalletStr);

  await deploy("NFTLaunchpadKit", {
    from: deployer,
    args: [deployer, mintPrice, maxSupply, maxPerWallet],
    log: true,
  });
};

export default func;
func.tags = ["NFTLaunchpadKit"];
