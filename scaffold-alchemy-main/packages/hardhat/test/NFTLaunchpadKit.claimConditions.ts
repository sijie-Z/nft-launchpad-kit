import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Phased Claim Conditions 测试套件
 * 覆盖：Admin Setup、Phase Progression、Per-Wallet Limits、Merkle Proof、Payment、Edge Cases、View Functions、Backward Compatibility、Gas Benchmarks
 */
describe("NFTLaunchpadKit — Claim Conditions", function () {
  let deployer: any;
  let user: any;
  let user2: any;
  let other: any;
  let contract: any;

  async function deploy() {
    [deployer, user, user2, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
    contract = await Factory.deploy(
      deployer.address,
      ethers.parseEther("0.01"), // legacy mintPrice
      100, // maxSupply
      5, // legacy maxPerWallet
    );
    await contract.waitForDeployment();
  }

  // Helper: build a simple ClaimCondition
  function makeCondition(overrides: any = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
      startTimestamp: overrides.startTimestamp ?? now - 10,
      maxSupply: overrides.maxSupply ?? 50,
      supplyClaimed: overrides.supplyClaimed ?? 0,
      quantityLimitPerWallet: overrides.quantityLimitPerWallet ?? 5,
      pricePerToken: overrides.pricePerToken ?? ethers.parseEther("0.01"),
      currency: overrides.currency ?? ethers.ZeroAddress,
      merkleRoot: overrides.merkleRoot ?? ethers.ZeroHash,
      metadata: overrides.metadata ?? "phase-1",
    };
  }

  beforeEach(async () => {
    await deploy();
  });

  // ============================================================
  // Group 1: Admin Setup (6 tests)
  // ============================================================
  describe("Admin Setup", () => {
    it("setClaimConditions sets phases and emits ClaimConditionsSet", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 20 }),
        makeCondition({ startTimestamp: now + 1000, maxSupply: 30 }),
      ];
      await expect(contract.connect(deployer).setClaimConditions(phases))
        .to.emit(contract, "ClaimConditionsSet")
        .withArgs(2);
      expect(await contract.getClaimConditionCount()).to.equal(2n);
    });

    it("setClaimConditions reverts if timestamps not ascending", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now + 1000 }),
        makeCondition({ startTimestamp: now - 10 }), // earlier than first
      ];
      await expect(
        contract.connect(deployer).setClaimConditions(phases),
      ).to.be.revertedWithCustomError(contract, "ClaimConditionsNotOrdered");
    });

    it("setClaimConditions overwrites existing conditions idempotently", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases1 = [makeCondition({ startTimestamp: now - 10, maxSupply: 20 })];
      await contract.connect(deployer).setClaimConditions(phases1);
      expect(await contract.getClaimConditionCount()).to.equal(1n);

      const phases2 = [
        makeCondition({ startTimestamp: now - 5, maxSupply: 50 }),
        makeCondition({ startTimestamp: now + 100, maxSupply: 50 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases2);
      expect(await contract.getClaimConditionCount()).to.equal(2n);
    });

    it("setClaimCondition updates a single phase", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 20 }),
        makeCondition({ startTimestamp: now + 1000, maxSupply: 30 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      const updated = makeCondition({ startTimestamp: now - 5, maxSupply: 99 });
      await expect(contract.connect(deployer).setClaimCondition(1, updated))
        .to.emit(contract, "ClaimConditionUpdated")
        .withArgs(1);

      const cond = await contract.getClaimConditionById(1);
      expect(cond.maxSupply).to.equal(99n);
    });

    it("setClaimCondition preserves supplyClaimed when claims exist", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 20 })];
      await contract.connect(deployer).setClaimConditions(phases);

      // Make a claim to increment supplyClaimed
      await contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });

      // Update the phase with new maxSupply
      const updated = makeCondition({ startTimestamp: now - 10, maxSupply: 99 });
      await contract.connect(deployer).setClaimCondition(0, updated);

      const cond = await contract.getClaimConditionById(0);
      expect(cond.supplyClaimed).to.equal(1n); // preserved
      expect(cond.maxSupply).to.equal(99n); // updated
    });

    it("setClaimCondition reverts for out-of-bounds phaseId", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10 })];
      await contract.connect(deployer).setClaimConditions(phases);
      await expect(
        contract.connect(deployer).setClaimCondition(5, makeCondition()),
      ).to.be.revertedWithCustomError(contract, "NoClaimConditions");
    });
  });

  // ============================================================
  // Group 2: Phase Progression (5 tests)
  // ============================================================
  describe("Phase Progression", () => {
    it("claim() mints in active phase", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 20 })];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.emit(contract, "Claimed");
      expect(await contract.ownerOf(0)).to.equal(user.address);
    });

    it("claim() reverts with PhaseNotStarted when timestamp is in the future", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now + 3600 })];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "PhaseNotStarted");
    });

    it("claim() auto-advances when phase supply is exhausted", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 2, quantityLimitPerWallet: 2 }),
        makeCondition({ startTimestamp: now - 5, maxSupply: 10, quantityLimitPerWallet: 5 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      // Exhaust phase 0 (2 tokens)
      await contract.connect(user).claim(2, [], { value: ethers.parseEther("0.02") });

      // Should auto-advance to phase 1
      const [phaseId] = await contract.getActiveClaimPhase();
      expect(phaseId).to.equal(1n);
    });

    it("claim() reverts with PhaseNotStarted if next phase hasn't started yet", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 1, quantityLimitPerWallet: 1 }),
        makeCondition({ startTimestamp: now + 3600, maxSupply: 10 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      // Exhaust phase 0
      await contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });

      // Phase 1 hasn't started yet
      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "PhaseNotStarted");
    });

    it("nextPhase() manually advances; reverts with AllPhasesComplete at the end", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10 })];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(deployer).nextPhase(),
      ).to.be.revertedWithCustomError(contract, "AllPhasesComplete");

      // With 2 phases, nextPhase works once
      const phases2 = [
        makeCondition({ startTimestamp: now - 10 }),
        makeCondition({ startTimestamp: now + 1000 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases2);
      await expect(contract.connect(deployer).nextPhase())
        .to.emit(contract, "PhaseAdvanced")
        .withArgs(0, 1);
    });
  });

  // ============================================================
  // Group 3: Per-Wallet Limits (3 tests)
  // ============================================================
  describe("Per-Wallet Limits", () => {
    it("user can claim up to quantityLimitPerWallet across multiple txs", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 50, quantityLimitPerWallet: 3 })];
      await contract.connect(deployer).setClaimConditions(phases);

      await contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });
      await contract.connect(user).claim(2, [], { value: ethers.parseEther("0.02") });

      const [count] = await contract.getClaimTimestamp(user.address, 0);
      expect(count).to.equal(3n);
    });

    it("reverts with WalletMintLimitExceeded when limit is hit", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 50, quantityLimitPerWallet: 2 })];
      await contract.connect(deployer).setClaimConditions(phases);

      await contract.connect(user).claim(2, [], { value: ethers.parseEther("0.02") });
      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "WalletMintLimitExceeded");
    });

    it("different phases have independent per-wallet limits", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 2, quantityLimitPerWallet: 1 }),
        makeCondition({ startTimestamp: now - 5, maxSupply: 50, quantityLimitPerWallet: 5 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      // User maxes out phase 0 (limit=1)
      await contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });
      // User2 exhausts remaining phase 0 supply
      await contract.connect(user2).claim(1, [], { value: ethers.parseEther("0.01") });

      // Phase 0 exhausted → auto-advance to phase 1
      // User can claim in phase 1 (independent limit)
      await contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });
      const [count] = await contract.getClaimTimestamp(user.address, 1);
      expect(count).to.equal(1n);
    });
  });

  // ============================================================
  // Group 4: Merkle Proof (3 tests)
  // ============================================================
  describe("Merkle Proof", () => {
    it("claim() with valid Merkle proof succeeds", async () => {
      const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [user.address]));
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 10, merkleRoot: leaf }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.emit(contract, "Claimed");
    });

    it("claim() with invalid proof reverts", async () => {
      const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [user.address]));
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 10, merkleRoot: leaf }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      // other is not in the allowlist
      await expect(
        contract.connect(other).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "NotInAllowlist");
    });

    it("public phase (merkleRoot == 0) accepts any address with empty proof", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 10, merkleRoot: ethers.ZeroHash }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(other).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.emit(contract, "Claimed");
    });
  });

  // ============================================================
  // Group 5: Payment (4 tests)
  // ============================================================
  describe("Payment", () => {
    it("ETH payment: exact amount succeeds", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, pricePerToken: ethers.parseEther("0.05") })];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.05") }),
      ).to.emit(contract, "Claimed");
    });

    it("ETH payment: insufficient amount reverts", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, pricePerToken: ethers.parseEther("0.05") })];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.001") }),
      ).to.be.revertedWithCustomError(contract, "NotEnoughEtherSent");
    });

    it("free mint: pricePerToken == 0 succeeds with zero value", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, pricePerToken: 0n })];
      await contract.connect(deployer).setClaimConditions(phases);

      await expect(
        contract.connect(user).claim(1, [], { value: 0 }),
      ).to.emit(contract, "Claimed");
    });

    it("excess ETH is refunded", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, pricePerToken: ethers.parseEther("0.01") })];
      await contract.connect(deployer).setClaimConditions(phases);

      const balBefore = await ethers.provider.getBalance(user.address);
      const tx = await contract
        .connect(user)
        .claim(1, [], { value: ethers.parseEther("0.1") });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const balAfter = await ethers.provider.getBalance(user.address);
      const spent = balBefore - balAfter - gasCost;
      expect(spent).to.equal(ethers.parseEther("0.01"));
    });
  });

  // ============================================================
  // Group 6: Edge Cases (4 tests)
  // ============================================================
  describe("Edge Cases", () => {
    it("claim() reverts with NoClaimConditions when no phases configured", async () => {
      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "NoClaimConditions");
    });

    it("claim() reverts with AllPhasesComplete when all phases exhausted", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 1, quantityLimitPerWallet: 1 }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);
      await contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "AllPhasesComplete");
    });

    it("claim() reverts when paused", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10 })];
      await contract.connect(deployer).setClaimConditions(phases);
      await contract.connect(deployer).pause();

      await expect(
        contract.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(contract, "ContractPaused");
    });

    it("claim() respects global maxSupply across all mint paths", async () => {
      const now = Math.floor(Date.now() / 1000);
      // Deploy with maxSupply=10
      const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
      const small = await Factory.deploy(deployer.address, ethers.parseEther("0.01"), 10, 10);
      await small.waitForDeployment();

      // Mint 9 via legacy
      await small.connect(deployer).setSaleState(true);
      await small.connect(user).mint(9, { value: ethers.parseEther("0.09") });

      // Configure claim with 5 maxSupply but only 1 global slot left
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 5, quantityLimitPerWallet: 5 })];
      await small.connect(deployer).setClaimConditions(phases);

      // Claim 1 should work
      await small.connect(user).claim(1, [], { value: ethers.parseEther("0.01") });

      // Claim 1 more should fail (global maxSupply=10 reached)
      await expect(
        small.connect(user).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(small, "MaxSupplyExceeded");
    });
  });

  // ============================================================
  // Group 7: View Functions (3 tests)
  // ============================================================
  describe("View Functions", () => {
    it("getActiveClaimPhase returns correct phaseId and data", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [
        makeCondition({ startTimestamp: now - 10, maxSupply: 20, metadata: "OG Phase" }),
        makeCondition({ startTimestamp: now + 1000, maxSupply: 30, metadata: "Public Phase" }),
      ];
      await contract.connect(deployer).setClaimConditions(phases);

      const [phaseId, cond] = await contract.getActiveClaimPhase();
      expect(phaseId).to.equal(0n);
      expect(cond.maxSupply).to.equal(20n);
      expect(cond.metadata).to.equal("OG Phase");
    });

    it("getClaimConditionById returns correct data; reverts for invalid ID", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 20 })];
      await contract.connect(deployer).setClaimConditions(phases);

      const cond = await contract.getClaimConditionById(0);
      expect(cond.maxSupply).to.equal(20n);

      await expect(
        contract.getClaimConditionById(99),
      ).to.be.revertedWithCustomError(contract, "NoClaimConditions");
    });

    it("getClaimTimestamp returns correct count and timestamp after claiming", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 20 })];
      await contract.connect(deployer).setClaimConditions(phases);

      await contract.connect(user).claim(2, [], { value: ethers.parseEther("0.02") });

      const [count, lastTs] = await contract.getClaimTimestamp(user.address, 0);
      expect(count).to.equal(2n);
      expect(lastTs).to.be.gt(0n);
    });
  });

  // ============================================================
  // Group 8: Backward Compatibility (2 tests)
  // ============================================================
  describe("Backward Compatibility", () => {
    it("legacy mint() and claim conditions can coexist", async () => {
      const now = Math.floor(Date.now() / 1000);

      // Enable legacy mint
      await contract.connect(deployer).setSaleState(true);

      // Also set claim conditions
      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 50 })];
      await contract.connect(deployer).setClaimConditions(phases);

      // User mints via legacy
      await contract.connect(user).mint(1, { value: ethers.parseEther("0.01") });
      expect(await contract.ownerOf(0)).to.equal(user.address);

      // User2 claims via claim conditions
      await contract.connect(user2).claim(1, [], { value: ethers.parseEther("0.01") });
      expect(await contract.ownerOf(1)).to.equal(user2.address);

      // Both systems share global supply counter
      // tokenId 0 and 1 are both minted
    });

    it("legacy mint and claim share global maxSupply", async () => {
      const now = Math.floor(Date.now() / 1000);
      const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
      const small = await Factory.deploy(deployer.address, ethers.parseEther("0.01"), 5, 5);
      await small.waitForDeployment();

      await small.connect(deployer).setSaleState(true);
      await small.connect(user).mint(3, { value: ethers.parseEther("0.03") });

      const phases = [makeCondition({ startTimestamp: now - 10, maxSupply: 5, quantityLimitPerWallet: 5 })];
      await small.connect(deployer).setClaimConditions(phases);

      // 2 global slots remaining
      await small.connect(user2).claim(2, [], { value: ethers.parseEther("0.02") });

      // 3rd should fail (global maxSupply=5)
      await expect(
        small.connect(user2).claim(1, [], { value: ethers.parseEther("0.01") }),
      ).to.be.revertedWithCustomError(small, "MaxSupplyExceeded");
    });
  });

  // ============================================================
  // Group 9: Gas Benchmarks (2 tests)
  // ============================================================
  describe("Gas Benchmarks", () => {
    it("claim(1) gas measurement", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, pricePerToken: 0n })];
      await contract.connect(deployer).setClaimConditions(phases);

      const tx = await contract.connect(user).claim(1, [], { value: 0 });
      const receipt = await tx.wait();
      console.log(`    ⛽ claim(1) gas: ${receipt!.gasUsed.toString()}`);
    });

    it("claim(5) gas measurement", async () => {
      const now = Math.floor(Date.now() / 1000);
      const phases = [makeCondition({ startTimestamp: now - 10, pricePerToken: 0n, quantityLimitPerWallet: 5 })];
      await contract.connect(deployer).setClaimConditions(phases);

      const tx = await contract.connect(user).claim(5, [], { value: 0 });
      const receipt = await tx.wait();
      console.log(`    ⛽ claim(5) gas: ${receipt!.gasUsed.toString()}`);
    });
  });
});
