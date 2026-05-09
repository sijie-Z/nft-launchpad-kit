import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * 小白说明：这个测试文件会逐步验证我们在合约里加入的高级功能：
 * 1）公开销售铸造；2）版税查询；3）白名单铸造；4）荷兰拍卖价格与铸造；5）签名授权铸造
 */
describe("NFTLaunchpadKit Advanced", function () {
  // 小白：通用变量，方便在多个用例里使用
  let deployer: any;
  let user: any;
  let signer: any;
  let contract: any;

  /**
   * 函数级注释：部署合约的辅助方法
   * 用最直白的话：创建一个新的合约实例，用我们设定的初始参数
   */
  async function deploy() {
    [deployer, user, signer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
    contract = await Factory.deploy(
      deployer.address, // 初始所有者
      ethers.parseEther("0.01"), // 单价 0.01 ETH
      100, // 最大总量
      5 // 每钱包最多 5 个
    );
    await contract.waitForDeployment();
  }

  beforeEach(async () => {
    await deploy();
  });

  it("公开销售铸造与计数器工作正常", async () => {
    // 暂停状态下铸造会被拒绝
    await contract.connect(deployer).pause();
    await expect(contract.connect(user).mint(1, { value: ethers.parseEther("0.01") }))
      .to.be.revertedWithCustomError(contract, "ContractPaused");
    await contract.connect(deployer).unpause();
    await contract.connect(deployer).setSaleState(true);
    await expect(contract.connect(user).mint(0, { value: 0n }))
      .to.be.revertedWithCustomError(contract, "InvalidMintQuantity");

    // 小白：按单价付够钱
    await expect(contract.connect(user).mint(2, { value: ethers.parseEther("0.02") }))
      .to.emit(contract, "Transfer");

    // 小白：再铸造 3 个，合计 5，达到每钱包上限
    await contract.connect(user).mint(3, { value: ethers.parseEther("0.03") });
    await expect(contract.connect(user).mint(1, { value: ethers.parseEther("0.01") }))
      .to.be.revertedWithCustomError(contract, "WalletMintLimitExceeded");
  });

  it("版税查询（EIP-2981）返回正确", async () => {
    // 小白：设置为 5% 给 deployer
    await contract.connect(deployer).setDefaultRoyalty(deployer.address, 500);
    const salePrice = 10_000n; // 假设售价 10000 Wei
    const [receiver, royaltyAmount] = await contract.royaltyInfo(1, salePrice);
    expect(receiver).to.equal(deployer.address);
    expect(royaltyAmount).to.equal(500n); // 5%
  });

  it("白名单铸造（单叶根）成功", async () => {
    // 小白：单叶树根 = 叶子本身（简化测试，不需要额外库）
    const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [user.address]));
    await contract.connect(deployer).setAllowlistMerkleRoot(leaf);
    await contract.connect(deployer).setAllowlistSaleState(true);

    // 小白：proof 为空数组即可（因为只有一个叶子）
    await contract.connect(user).mintAllowlist(1, [], { value: ethers.parseEther("0.01") });

    // 小白：另一个地址不是白名单
    const other = signer;
    await expect(
      contract.connect(other).mintAllowlist(1, [], { value: ethers.parseEther("0.01") })
    ).to.be.revertedWithCustomError(contract, "NotInAllowlist");
  });

  it("荷兰拍卖价格线性下降并可铸造", async () => {
    const latest = await ethers.provider.getBlock("latest");
    const now = latest!.timestamp;
    await contract.connect(deployer).configureDutchAuction(
      ethers.parseEther("0.05"),
      ethers.parseEther("0.01"),
      now + 10,
      100
    );

    // 未开始时：起始价
    expect(await contract.currentAuctionPrice()).to.equal(ethers.parseEther("0.05"));

    // 时间前进到中间（小白：模拟过了 60 秒）
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + 70]);
    await ethers.provider.send("evm_mine", []);
    const midPrice = await contract.currentAuctionPrice();
    expect(midPrice).to.be.lt(ethers.parseEther("0.05"));
    expect(midPrice).to.be.gt(ethers.parseEther("0.01"));

    // 按当前价格铸造 1 个
    await contract.connect(deployer).setMaxPerWallet(100); // 放宽上限
    await contract.connect(user).mintDutchAuction(1, { value: midPrice });
  });

  it("签名授权铸造成功（抗重放）", async () => {
    await contract.connect(deployer).setTrustedSigner(deployer.address);
    const quantity = 2n;
    const maxMint = 3n;
    const latest2 = await ethers.provider.getBlock("latest");
    const deadline = BigInt(latest2!.timestamp + 3600);
    const nonce = 0n;

    // 小白：构造和合约一致的哈希，再用 signer 对它签名
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
        [user.address, quantity, maxMint, deadline, nonce, await contract.getAddress(), BigInt(31337)]
      )
    );
    const signature = await deployer.signMessage(ethers.getBytes(messageHash));

    await expect(
      contract.connect(user).mintWithSignature(quantity, maxMint, deadline, nonce, signature, {
        value: ethers.parseEther("0.02"),
      })
    ).to.emit(contract, "Transfer");

    // 同一 nonce 重放会被拒绝（nonce 已递增）
    await expect(
      contract.connect(user).mintWithSignature(quantity, maxMint, deadline, nonce, signature, {
        value: ethers.parseEther("0.02"),
      })
    ).to.be.revertedWithCustomError(contract, "BadSignature");
  });

  it("EIP-712 结构化签名铸造成功", async () => {
    await contract.connect(deployer).setTrustedSigner(deployer.address);
    await contract.connect(deployer).setSaleState(true);
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
      name: "NFT Launchpad Kit",
      version: "1",
      chainId,
      verifyingContract: await contract.getAddress(),
    };
    const types = {
      MintAuthorization: [
        { name: "minter", type: "address" },
        { name: "quantity", type: "uint256" },
        { name: "maxMint", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };
    const latest3 = await ethers.provider.getBlock("latest");
    const value = {
      minter: user.address,
      quantity: 2n,
      maxMint: 3n,
      deadline: BigInt(latest3!.timestamp + 3600),
      nonce: 0n,
    };
    const signature = await deployer.signTypedData(domain, types, value);
    await expect(
      contract.connect(user).mintWithSignature712(value.quantity, value.maxMint, value.deadline, value.nonce, signature, {
        value: ethers.parseEther("0.02"),
      })
    ).to.emit(contract, "Transfer");
  });

  it("提现按比例分配（withdrawSplit）正确", async () => {
    await contract.connect(deployer).setSaleState(true);
    // 设置分配：deployer 70%，user 30%
    await contract.connect(deployer).setPayoutRecipients([deployer.address, user.address], [7000, 3000]);

    // user 支付 0.02 ETH 铸造 2 个（价格 0.01/个）
    await contract.connect(user).mint(2, { value: ethers.parseEther("0.02") });

    const balDeployerBefore = await ethers.provider.getBalance(deployer.address);
    const balUserBefore = await ethers.provider.getBalance(user.address);

    // 由所有者执行分配
    const tx = await contract.connect(deployer).withdrawSplit();
    const receipt = await tx.wait();
    const gasPrice = receipt!.gasPrice ?? 0n;
    const gasPaid: bigint = receipt!.gasUsed * gasPrice;

    const balDeployerAfter = await ethers.provider.getBalance(deployer.address);
    const balUserAfter = await ethers.provider.getBalance(user.address);

    // 总余额 0.02，按 70/30 分配
    const expectDeployerGain = ethers.parseEther("0.014");
    const expectUserGain = ethers.parseEther("0.006");

    // 部署者余额增加 = 收到分配 - 执行交易的 gas
    expect((balDeployerAfter - balDeployerBefore) + gasPaid).to.equal(expectDeployerGain);
    expect(balUserAfter - balUserBefore).to.equal(expectUserGain);
  });

  it("ERC20 支付铸造与提现代币", async () => {
    const erc20Factory = await ethers.getContractFactory("TestERC20");
    const token = await erc20Factory.deploy("TestToken", "TT");
    await token.waitForDeployment();

    // 给用户铸造测试代币并授权给合约
    await token.mint(user.address, ethers.parseEther("100"));
    await contract.connect(deployer).setSaleState(true);
    await contract.connect(deployer).setAcceptedToken(await token.getAddress(), ethers.parseEther("0.01"));
    await token.connect(user).approve(await contract.getAddress(), ethers.parseEther("1"));

    // 使用代币支付铸造 2 个
    await expect(contract.connect(user).mintWithERC20(2)).to.emit(contract, "Transfer");

    // 提现代币到 deployer
    const balBefore = await token.balanceOf(deployer.address);
    await contract.connect(deployer).withdrawToken(await token.getAddress(), deployer.address, ethers.parseEther("0.02"));
    const balAfter = await token.balanceOf(deployer.address);
    expect(balAfter - balBefore).to.equal(ethers.parseEther("0.02"));
  });

  it("揭示与洗牌 tokenURI 生效（commit/reveal）", async () => {
    await contract.connect(deployer).setBaseURI("ipfs://base/");
    await contract.connect(deployer).setPreRevealURI("ipfs://placeholder/metadata.json");
    await contract.connect(deployer).setSaleState(true);
    await contract.connect(user).mint(1, { value: ethers.parseEther("0.01") });

    // 揭示前返回占位URI
    const uriBefore = await contract.tokenURI(0);
    expect(uriBefore).to.equal("ipfs://placeholder/metadata.json");

    // 提交承诺并揭示
    const seed = ethers.keccak256(ethers.toUtf8Bytes("my-seed"));
    const commit = ethers.keccak256(ethers.solidityPacked(["bytes32", "address"], [seed, await contract.getAddress()]));
    await contract.connect(deployer).commitReveal(commit);
    await contract.connect(deployer).finalizeReveal(seed);

    const uriAfter = await contract.tokenURI(0);
    expect(uriAfter.startsWith("ipfs://base/")).to.equal(true);
  });
});

