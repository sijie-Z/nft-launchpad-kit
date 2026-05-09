import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Load / stress tests — simulates concurrent minting scenarios
 * to verify gas limits, supply tracking, and per-wallet limits under pressure.
 */
describe("NFTLaunchpadKit — Load Tests", function () {
  let deployer: any;
  let users: any[];
  let contract: any;

  const MAX_SUPPLY = 100;
  const MAX_PER_WALLET = 5;
  const MINT_PRICE = ethers.parseEther("0.01");

  async function deploy() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    users = signers.slice(1, 20); // 19 users (Hardhat default)

    const Factory = await ethers.getContractFactory("NFTLaunchpadKit");
    contract = await Factory.deploy(deployer.address, MINT_PRICE, MAX_SUPPLY, MAX_PER_WALLET);
    await contract.waitForDeployment();
    await contract.connect(deployer).setSaleState(true);
    await contract.connect(deployer).setMaxPerWallet(MAX_PER_WALLET);
  }

  beforeEach(async () => {
    await deploy();
  });

  // ============================================================
  // Concurrent Minting
  // ============================================================
  describe("Concurrent Minting", () => {
    it("19 users each mint 5 tokens (95 total), then supply check", async () => {
      // Each user mints 5 in separate txs (19 users * 5 = 95 tokens)
      for (let i = 0; i < 19; i++) {
        await contract
          .connect(users[i])
          .mint(5, { value: MINT_PRICE * 5n });
      }

      // Verify tokens minted correctly
      for (let i = 0; i < 95; i++) {
        const owner = await contract.ownerOf(i);
        const expectedUser = users[Math.floor(i / 5)];
        expect(owner).to.equal(expectedUser.address);
      }

      // users[0] already at limit (5), deployer mints remaining 5
      await contract.connect(deployer).mint(5, { value: MINT_PRICE * 5n });

      // Supply exhausted — next mint should revert
      await expect(
        contract.connect(users[0]).mint(1, { value: MINT_PRICE }),
      ).to.be.revertedWithCustomError(contract, "MaxSupplyExceeded");
    });

    it("per-wallet limit enforced across multiple txs", async () => {
      // User 0 mints 3, then tries to mint 3 more (limit is 5)
      await contract.connect(users[0]).mint(3, { value: MINT_PRICE * 3n });
      await expect(
        contract.connect(users[0]).mint(3, { value: MINT_PRICE * 3n }),
      ).to.be.revertedWithCustomError(contract, "WalletMintLimitExceeded");

      // But can mint 2 more (total = 5)
      await contract.connect(users[0]).mint(2, { value: MINT_PRICE * 2n });
      expect(await contract.ownerOf(4)).to.equal(users[0].address);
    });

    it("batch mint of 20 (MAX_BATCH_SIZE) succeeds", async () => {
      await contract.connect(deployer).setMaxPerWallet(100);
      await contract.connect(users[0]).mint(20, { value: MINT_PRICE * 20n });

      for (let i = 0; i < 20; i++) {
        expect(await contract.ownerOf(i)).to.equal(users[0].address);
      }
    });
  });

  // ============================================================
  // Claim Conditions Under Load
  // ============================================================
  describe("Claim Conditions Under Load", () => {
    it("10 users claim from phase 0, then phase 1 auto-activates", async () => {
      const now = (await ethers.provider.getBlock("latest"))!.timestamp;

      await contract.connect(deployer).setClaimConditions([
        {
          startTimestamp: now - 10,
          maxSupply: 10,
          supplyClaimed: 0,
          quantityLimitPerWallet: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: MINT_PRICE,
          merkleRoot: ethers.ZeroHash,
          metadata: "",
        },
        {
          startTimestamp: now - 5,
          maxSupply: 90,
          supplyClaimed: 0,
          quantityLimitPerWallet: 5,
          currency: ethers.ZeroAddress,
          pricePerToken: MINT_PRICE * 2n,
          merkleRoot: ethers.ZeroHash,
          metadata: "",
        },
      ]);

      // 10 users claim 1 each from phase 0
      for (let i = 0; i < 10; i++) {
        await contract
          .connect(users[i])
          .claim(1, [], { value: MINT_PRICE });
      }

      // Phase 0 exhausted, phase 1 should be active
      const [phaseId] = await contract.getActiveClaimPhase();
      expect(phaseId).to.equal(1);

      // Users can now claim from phase 1 at higher price
      await contract
        .connect(users[0])
        .claim(2, [], { value: MINT_PRICE * 2n * 2n });

      expect(await contract.ownerOf(10)).to.equal(users[0].address);
      expect(await contract.ownerOf(11)).to.equal(users[0].address);
    });

    it("Merkle-protected phase handles 10 users with valid proofs", async () => {
      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const testUsers = users.slice(0, 10);

      // Build Merkle tree matching contract's leaf: keccak256(abi.encodePacked(address))
      const leaves = testUsers.map((u: any) =>
        ethers.keccak256(ethers.solidityPacked(["address"], [u.address])),
      );

      // Pad to power of 2
      let size = 1;
      while (size < leaves.length) size *= 2;
      while (leaves.length < size) leaves.push(ethers.ZeroHash);

      // Build tree bottom-up
      const layers: string[][] = [leaves];
      let current = leaves;
      while (current.length > 1) {
        const next: string[] = [];
        for (let i = 0; i < current.length; i += 2) {
          const left = current[i];
          const right = current[i + 1];
          // Sort pair for OpenZeppelin MerkleProof
          if (BigInt(left) <= BigInt(right)) {
            next.push(ethers.keccak256(ethers.concat([left, right])));
          } else {
            next.push(ethers.keccak256(ethers.concat([right, left])));
          }
        }
        current = next;
        layers.push(current);
      }
      const root = layers[layers.length - 1][0];

      function getProof(index: number): string[] {
        const proof: string[] = [];
        let idx = index;
        for (let i = 0; i < layers.length - 1; i++) {
          const layer = layers[i];
          const isRight = idx % 2 === 1;
          const siblingIdx = isRight ? idx - 1 : idx + 1;
          if (siblingIdx < layer.length) {
            proof.push(layer[siblingIdx]);
          }
          idx = Math.floor(idx / 2);
        }
        return proof;
      }

      await contract.connect(deployer).setClaimConditions([
        {
          startTimestamp: now - 10,
          maxSupply: 10,
          supplyClaimed: 0,
          quantityLimitPerWallet: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: 0,
          merkleRoot: root,
          metadata: "",
        },
      ]);

      // Each user claims with their proof
      for (let i = 0; i < 10; i++) {
        const proof = getProof(i);
        await contract.connect(testUsers[i]).claim(1, proof);
      }

      // All 10 tokens claimed
      for (let i = 0; i < 10; i++) {
        expect(await contract.ownerOf(i)).to.equal(testUsers[i].address);
      }
    });
  });

  // ============================================================
  // Dutch Auction Stress
  // ============================================================
  describe("Dutch Auction Stress", () => {
    it("price decreases correctly over time with multiple buyers", async () => {
      const latest = await ethers.provider.getBlock("latest");
      const now = latest!.timestamp;

      await contract.connect(deployer).configureDutchAuction(
        ethers.parseEther("0.1"),  // start: 0.1 ETH
        ethers.parseEther("0.01"), // end: 0.01 ETH
        now + 10,
        100,                       // 100 seconds duration
      );
      await contract.connect(deployer).setMaxPerWallet(100);

      // Move to start of auction
      await ethers.provider.send("evm_setNextBlockTimestamp", [now + 10]);
      await ethers.provider.send("evm_mine", []);

      const priceAtStart = await contract.currentAuctionPrice();
      expect(priceAtStart).to.equal(ethers.parseEther("0.1"));

      // Move to middle of auction
      await ethers.provider.send("evm_setNextBlockTimestamp", [now + 60]);
      await ethers.provider.send("evm_mine", []);

      const priceAtMiddle = await contract.currentAuctionPrice();
      // Should be ~0.055 ETH (linear interpolation)
      expect(priceAtMiddle).to.be.gt(ethers.parseEther("0.05"));
      expect(priceAtMiddle).to.be.lt(ethers.parseEther("0.06"));

      // Multiple users mint at different times
      await contract.connect(users[0]).mint(1, { value: ethers.parseEther("0.1") });
      await contract.connect(users[1]).mint(1, { value: ethers.parseEther("0.1") });

      expect(await contract.ownerOf(0)).to.equal(users[0].address);
      expect(await contract.ownerOf(1)).to.equal(users[1].address);
    });
  });

  // ============================================================
  // Gas Stress — Large Batch
  // ============================================================
  describe("Gas Stress", () => {
    it("mint 20 tokens in one tx — gas within block limit", async () => {
      await contract.connect(deployer).setMaxPerWallet(100);
      const tx = await contract
        .connect(users[0])
        .mint(20, { value: MINT_PRICE * 20n });
      const receipt = await tx.wait();

      console.log(`    mint(20) gas used: ${receipt!.gasUsed}`);
      // Should be well under 30M gas block limit
      expect(receipt!.gasUsed).to.be.lt(30_000_000n);
    });

    it("claim 20 tokens in one tx — gas within block limit", async () => {
      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      await contract.connect(deployer).setClaimConditions([
        {
          startTimestamp: now,
          maxSupply: 100,
          supplyClaimed: 0,
          quantityLimitPerWallet: 20,
          currency: ethers.ZeroAddress,
          pricePerToken: MINT_PRICE,
          merkleRoot: ethers.ZeroHash,
          metadata: "",
        },
      ]);

      const tx = await contract
        .connect(users[0])
        .claim(20, [], { value: MINT_PRICE * 20n });
      const receipt = await tx.wait();

      console.log(`    claim(20) gas used: ${receipt!.gasUsed}`);
      expect(receipt!.gasUsed).to.be.lt(30_000_000n);
    });
  });
});
