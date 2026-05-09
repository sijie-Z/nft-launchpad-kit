import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // 获取已部署的 NFTLaunchpadKit 地址作为实现合约
  const implementation = await get("NFTLaunchpadKit");

  await deploy("NFTLaunchpadKitFactory", {
    from: deployer,
    args: [implementation.address, deployer],
    log: true,
  });
};

export default func;
func.tags = ["NFTLaunchpadKitFactory"];
func.dependencies = ["NFTLaunchpadKit"];
