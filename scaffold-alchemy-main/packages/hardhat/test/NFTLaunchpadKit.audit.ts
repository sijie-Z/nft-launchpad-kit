import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * v11 审计补充测试 — 覆盖所有在 Bug 修复中新增的安全路径
 *
 * 测试清单（18 个路径）：
 * 1. 构造函数：maxSupply=0 revert
 * 2. 构造函数：maxPerWallet=0 revert
 * 3. 构造函数：maxPerWallet > maxSupply revert
 * 4. mint excess ETH refund
 * 5. mintAllowlist excess ETH refund
 * 6. mintDutchAuction excess ETH refund
 * 7. mintWithSignature excess ETH refund
 * 8. mintWithSignature712 excess ETH refund
 * 9. mintDutchAuction: auctionStartTime==0 revert (free-mint fix)
 * 10. _configureDutchAuction: startPrice=0 revert
 * 11. transferOwnership: DEFAULT_ADMIN_ROLE sync
 * 12. withdraw: payoutRecipients.length > 0 revert
 * 13. withdraw: zero balance revert
 * 14. _batchMint: MAX_BATCH_SIZE exceeded revert
 * 15. _batchMint: CEI — tokenIdTracker updated before _safeMint
 * 16. Feistel shuffle: deterministic (same seed → same output)
 * 17. Feistel shuffle: bijective (all outputs in [0, range))
 * 18. _feistelShuffle: range=1 returns 0
 */
describe("NFTLaunchpadKit — Audit Coverage", function () {
  let deployer: any;
  let user: any;
  let other: any;
  let contract: any;

  async function deploy() {
    [deployer, user, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
    contract = await Factory.deploy(
      deployer.address,
      ethers.parseEther("0.01"),
      100,
      5,
    );
    await contract.waitForDeployment();
  }

  beforeEach(async () => {
    await deploy();
  });

  // ============================================================
  // 1-3. Constructor validation
  // ============================================================
  describe("Constructor validation", () => {
    it("reverts when maxSupply = 0", async () => {
      const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
      await expect(
        Factory.deploy(deployer.address, ethers.parseEther("0.01"), 0, 5),
      ).to.be.revertedWithCustomError(contract, "MaxSupplyExceeded");
    });

    it("reverts when maxPerWallet = 0", async () => {
      const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
      await expect(
        Factory.deploy(deployer.address, ethers.parseEther("0.01"), 100, 0),
      ).to.be.revertedWithCustomError(contract, "WalletMintLimitExceeded");
    });

    it("reverts when maxPerWallet > maxSupply", async () => {
      const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
      await expect(
        Factory.deploy(deployer.address, ethers.parseEther("0.01"), 5, 10),
      ).to.be.revertedWithCustomError(contract, "WalletMintLimitExceeded");
    });
  });

  // ============================================================
  // 4-8. Excess ETH refund on all payable mint functions
  // ============================================================
  describe("Excess ETH refund", () => {
    it("mint() refunds excess ETH", async () => {
      await contract.connect(deployer).setSaleState(true);
      const balBefore = await ethers.provider.getBalance(user.address);
      const tx = await contract
        .connect(user)
        .mint(1, { value: ethers.parseEther("0.1") }); // price is 0.01
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(user.address);
      // User should only pay 0.01 + gas, not 0.1
      const spent = balBefore - balAfter - gasCost;
      expect(spent).to.equal(ethers.parseEther("0.01"));
    });

    it("mintAllowlist() refunds excess ETH", async () => {
      const leaf = ethers.keccak256(
        ethers.solidityPacked(["address"], [user.address]),
      );
      await contract.connect(deployer).setAllowlistMerkleRoot(leaf);
      await contract.connect(deployer).setAllowlistSaleState(true);

      const balBefore = await ethers.provider.getBalance(user.address);
      const tx = await contract
        .connect(user)
        .mintAllowlist(1, [], { value: ethers.parseEther("0.05") });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(user.address);
      const spent = balBefore - balAfter - gasCost;
      expect(spent).to.equal(ethers.parseEther("0.01"));
    });

    it("mintDutchAuction() refunds excess ETH", async () => {
      const latest = await ethers.provider.getBlock("latest");
      const now = latest!.timestamp;
      await contract
        .connect(deployer)
        .configureDutchAuction(
          ethers.parseEther("0.02"),
          ethers.parseEther("0.01"),
          now + 10,
          100,
        );
      await contract.connect(deployer).setMaxPerWallet(100);
      // Move past start so auction is active
      await ethers.provider.send("evm_setNextBlockTimestamp", [now + 50]);
      await ethers.provider.send("evm_mine", []);

      const price = await contract.currentAuctionPrice();
      const overpay = ethers.parseEther("0.1");
      const balBefore = await ethers.provider.getBalance(user.address);
      const tx = await contract
        .connect(user)
        .mintDutchAuction(1, { value: overpay });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(user.address);
      const spent = balBefore - balAfter - gasCost;
      // Should only pay the actual auction price (rounded), not the full overpay
      expect(spent).to.be.gt(ethers.parseEther("0.01"));
      expect(spent).to.be.lt(overpay);
    });

    it("mintWithSignature() refunds excess ETH", async () => {
      await contract
        .connect(deployer)
        .setTrustedSigner(deployer.address);
      const latest = await ethers.provider.getBlock("latest");
      const deadline = BigInt(latest!.timestamp + 3600);
      const quantity = 1n;
      const maxMint = 5n;
      const nonce = 0n;
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
          [user.address, quantity, maxMint, deadline, nonce, await contract.getAddress(), 31337n],
        ),
      );
      const sig = await deployer.signMessage(ethers.getBytes(messageHash));

      const balBefore = await ethers.provider.getBalance(user.address);
      const tx = await contract
        .connect(user)
        .mintWithSignature(quantity, maxMint, deadline, nonce, sig, {
          value: ethers.parseEther("0.1"),
        });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(user.address);
      const spent = balBefore - balAfter - gasCost;
      expect(spent).to.equal(ethers.parseEther("0.01"));
    });

    it("mintWithSignature712() refunds excess ETH", async () => {
      await contract
        .connect(deployer)
        .setTrustedSigner(deployer.address);
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
      const latest = await ethers.provider.getBlock("latest");
      const value = {
        minter: user.address,
        quantity: 1n,
        maxMint: 5n,
        deadline: BigInt(latest!.timestamp + 3600),
        nonce: 0n,
      };
      const sig = await deployer.signTypedData(domain, types, value);

      const balBefore = await ethers.provider.getBalance(user.address);
      const tx = await contract
        .connect(user)
        .mintWithSignature712(value.quantity, value.maxMint, value.deadline, value.nonce, sig, {
          value: ethers.parseEther("0.1"),
        });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(user.address);
      const spent = balBefore - balAfter - gasCost;
      expect(spent).to.equal(ethers.parseEther("0.01"));
    });
  });

  // ============================================================
  // 9. Dutch Auction: auctionStartTime == 0 reverts (free-mint fix)
  // ============================================================
  describe("Dutch Auction safety", () => {
    it("mintDutchAuction reverts when auction not configured (startTime=0)", async () => {
      await expect(
        contract.connect(user).mintDutchAuction(1, { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "SaleNotActive");
    });

    it("_configureDutchAuction reverts when startPrice=0", async () => {
      await expect(
        contract.connect(deployer).configureDutchAuction(0, 0, 1000, 100),
      ).to.be.revertedWithCustomError(contract, "InvalidAuctionConfig");
    });
  });

  // ============================================================
  // 11. transferOwnership syncs DEFAULT_ADMIN_ROLE
  // ============================================================
  describe("Ownership transfer", () => {
    it("new owner gets DEFAULT_ADMIN_ROLE, old owner loses it", async () => {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(
        await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address),
      ).to.equal(true);
      expect(
        await contract.hasRole(DEFAULT_ADMIN_ROLE, user.address),
      ).to.equal(false);

      await contract.connect(deployer).transferOwnership(user.address);

      expect(await contract.owner()).to.equal(user.address);
      expect(
        await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address),
      ).to.equal(false);
      expect(
        await contract.hasRole(DEFAULT_ADMIN_ROLE, user.address),
      ).to.equal(true);
    });

    it("new owner can call onlyOwner functions after transfer", async () => {
      await contract.connect(deployer).transferOwnership(user.address);
      // user is now owner — should be able to set sale state
      await expect(contract.connect(user).setSaleState(true))
        .to.emit(contract, "SaleStateChanged")
        .withArgs(true);
    });
  });

  // ============================================================
  // 12-13. withdraw() safety checks
  // ============================================================
  describe("withdraw() safety", () => {
    it("reverts when payoutRecipients is set (must use withdrawSplit)", async () => {
      await contract
        .connect(deployer)
        .setPayoutRecipients([deployer.address], [10000]);
      // Send some ETH to contract
      await contract.connect(deployer).setSaleState(true);
      await contract.connect(user).mint(1, { value: ethers.parseEther("0.01") });
      await expect(
        contract.connect(deployer).withdraw(),
      ).to.be.revertedWithCustomError(contract, "UseWithdrawSplit");
    });

    it("reverts when balance is zero", async () => {
      await expect(
        contract.connect(deployer).withdraw(),
      ).to.be.revertedWithCustomError(contract, "NoBalance");
    });
  });

  // ============================================================
  // 14. MAX_BATCH_SIZE exceeded
  // ============================================================
  describe("Batch size limit", () => {
    it("reverts when quantity > MAX_BATCH_SIZE (20)", async () => {
      await contract.connect(deployer).setSaleState(true);
      await contract.connect(deployer).setMaxPerWallet(100);
      await expect(
        contract.connect(user).mint(21, { value: ethers.parseEther("0.21") }),
      ).to.be.revertedWithCustomError(contract, "InvalidMintQuantity");
    });

    it("allows quantity == MAX_BATCH_SIZE (20)", async () => {
      await contract.connect(deployer).setSaleState(true);
      await contract.connect(deployer).setMaxPerWallet(100);
      await expect(
        contract.connect(user).mint(20, { value: ethers.parseEther("0.20") }),
      ).to.emit(contract, "Transfer");
    });
  });

  // ============================================================
  // 15. CEI — tokenIdTracker updated before _safeMint
  // ============================================================
  describe("CEI ordering", () => {
    it("tokenIdTracker is incremented before minting (no duplicate tokenIds)", async () => {
      await contract.connect(deployer).setSaleState(true);
      await contract.connect(deployer).setMaxPerWallet(100);
      // Mint 3 tokens
      await contract.connect(user).mint(3, { value: ethers.parseEther("0.03") });
      // Verify sequential tokenIds 0, 1, 2
      expect(await contract.ownerOf(0)).to.equal(user.address);
      expect(await contract.ownerOf(1)).to.equal(user.address);
      expect(await contract.ownerOf(2)).to.equal(user.address);
      // Token #3 should not exist yet (supply limit)
      await expect(contract.ownerOf(3)).to.be.reverted;
    });
  });

  // ============================================================
  // 16-18. Feistel shuffle properties
  // ============================================================
  describe("Feistel shuffle", () => {
    it("is deterministic — same inputs produce same output", async () => {
      // We can test via tokenURI after reveal
      await contract.connect(deployer).setBaseURI("ipfs://base/");
      await contract.connect(deployer).setPreRevealURI("ipfs://placeholder/");
      await contract.connect(deployer).setSaleState(true);
      await contract.connect(deployer).setMaxPerWallet(100);
      await contract.connect(user).mint(5, { value: ethers.parseEther("0.05") });

      const seed = ethers.keccak256(ethers.toUtf8Bytes("test-seed"));
      const commit = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "address"], [seed, await contract.getAddress()]),
      );
      await contract.connect(deployer).commitReveal(commit);
      await contract.connect(deployer).finalizeReveal(seed);

      // Read tokenURI twice — should be identical
      const uri1 = await contract.tokenURI(0);
      const uri2 = await contract.tokenURI(0);
      expect(uri1).to.equal(uri2);

      // All tokenURIs should be different (bijective mapping)
      const uris = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const uri = await contract.tokenURI(i);
        uris.add(uri);
      }
      expect(uris.size).to.equal(5);
    });

    it("all shuffled IDs are in [0, maxSupply)", async () => {
      await contract.connect(deployer).setBaseURI("ipfs://base/");
      await contract.connect(deployer).setPreRevealURI("ipfs://placeholder/");
      await contract.connect(deployer).setSaleState(true);
      await contract.connect(deployer).setMaxPerWallet(100);
      await contract.connect(user).mint(10, { value: ethers.parseEther("0.10") });

      const seed = ethers.keccak256(ethers.toUtf8Bytes("range-test"));
      const commit = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "address"], [seed, await contract.getAddress()]),
      );
      await contract.connect(deployer).commitReveal(commit);
      await contract.connect(deployer).finalizeReveal(seed);

      // Extract shuffled IDs from tokenURI
      const baseLen = "ipfs://base/".length;
      for (let i = 0; i < 10; i++) {
        const uri = await contract.tokenURI(i);
        const idStr = uri.slice(baseLen, uri.length - 5); // remove ".json"
        const shuffledId = parseInt(idStr, 10);
        expect(shuffledId).to.be.gte(0);
        expect(shuffledId).to.be.lt(100); // maxSupply = 100
      }
    });

    it("single token (range=1) always maps to 0", async () => {
      // Deploy with maxSupply=1
      const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
      const single = await Factory.deploy(deployer.address, ethers.parseEther("0.01"), 1, 1);
      await single.waitForDeployment();
      await single.connect(deployer).setBaseURI("ipfs://base/");
      await single.connect(deployer).setPreRevealURI("ipfs://placeholder/");
      await single.connect(deployer).setSaleState(true);
      await single.connect(user).mint(1, { value: ethers.parseEther("0.01") });

      const seed = ethers.keccak256(ethers.toUtf8Bytes("single"));
      const commit = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "address"], [seed, await single.getAddress()]),
      );
      await single.connect(deployer).commitReveal(commit);
      await single.connect(deployer).finalizeReveal(seed);

      const uri = await single.tokenURI(0);
      // Should contain "0.json" since range=1 → output=0
      expect(uri).to.equal("ipfs://base/0.json");
    });
  });
});
