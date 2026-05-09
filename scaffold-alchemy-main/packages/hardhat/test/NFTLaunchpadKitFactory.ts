import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFTLaunchpadKitFactory", function () {
  let deployer: any;
  let user1: any;
  let user2: any;
  let implementation: any;
  let factory: any;

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy implementation contract
    const Impl = await ethers.getContractFactory("NFTLaunchpadKit");
    implementation = await Impl.deploy(
      deployer.address,
      ethers.parseEther("0.01"),
      100,
      5,
    );
    await implementation.waitForDeployment();

    // Deploy factory
    const Factory = await ethers.getContractFactory("NFTLaunchpadKitFactory");
    factory = await Factory.deploy(
      await implementation.getAddress(),
      deployer.address,
    );
    await factory.waitForDeployment();
  });

  // ============================================================
  // Backward Compatibility
  // ============================================================
  describe("Backward Compatibility", () => {
    it("direct deployment still works without initialize()", async () => {
      const Impl = await ethers.getContractFactory("NFTLaunchpadKit");
      const direct = await Impl.deploy(
        deployer.address,
        ethers.parseEther("0.05"),
        200,
        10,
      );
      await direct.waitForDeployment();

      expect(await direct.name()).to.equal("NFT Launchpad Kit");
      expect(await direct.symbol()).to.equal("LPK");
      expect(await direct.maxSupply()).to.equal(200);
      expect(await direct.owner()).to.equal(deployer.address);

      // Should be able to mint
      await direct.setSaleState(true);
      await direct.connect(user1).mint(1, { value: ethers.parseEther("0.05") });
      expect(await direct.ownerOf(0)).to.equal(user1.address);
    });

    it("direct deployment cannot call initialize()", async () => {
      const Impl = await ethers.getContractFactory("NFTLaunchpadKit");
      const direct = await Impl.deploy(
        deployer.address,
        ethers.parseEther("0.01"),
        100,
        5,
      );
      await direct.waitForDeployment();

      // Initializer guard should revert (constructor already initialized)
      await expect(
        direct.initialize("Test", "TST", deployer.address, 100, 100, 5),
      ).to.be.revertedWithCustomError(direct, "InvalidInitialization");
    });
  });

  // ============================================================
  // Clone Deployment
  // ============================================================
  describe("Clone Deployment", () => {
    it("deploys a clone with correct parameters", async () => {
      const tx = await factory.deployCollection(
        "Cool Cats",
        "COOL",
        500,
        10,
        ethers.parseEther("0.05"),
      );
      const receipt = await tx.wait();

      // Get clone address from event
      const event = receipt!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log)?.name === "CollectionCloned";
        } catch {
          return false;
        }
      });
      const parsed = factory.interface.parseLog(event!);
      const cloneAddr = parsed!.args.cloneAddress;

      const clone = await ethers.getContractAt("NFTLaunchpadKit", cloneAddr);

      expect(await clone.name()).to.equal("Cool Cats");
      expect(await clone.symbol()).to.equal("COOL");
      expect(await clone.maxSupply()).to.equal(500);
      expect(await clone.maxPerWallet()).to.equal(10);
      expect(await clone.mintPrice()).to.equal(ethers.parseEther("0.05"));
      expect(await clone.owner()).to.equal(deployer.address);
    });

    it("clone can mint NFTs", async () => {
      const tx = await factory.deployCollection(
        "Test NFT",
        "TEST",
        100,
        5,
        ethers.parseEther("0.01"),
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log)?.name === "CollectionCloned";
        } catch {
          return false;
        }
      });
      const cloneAddr = factory.interface.parseLog(event!).args.cloneAddress;
      const clone = await ethers.getContractAt("NFTLaunchpadKit", cloneAddr);

      await clone.setSaleState(true);
      await clone.connect(user1).mint(2, { value: ethers.parseEther("0.02") });

      expect(await clone.ownerOf(0)).to.equal(user1.address);
      expect(await clone.ownerOf(1)).to.equal(user1.address);
    });

    it("clone can use claim conditions", async () => {
      const tx = await factory.deployCollection(
        "Claim Test",
        "CT",
        100,
        5,
        ethers.parseEther("0.01"),
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log)?.name === "CollectionCloned";
        } catch {
          return false;
        }
      });
      const cloneAddr = factory.interface.parseLog(event!).args.cloneAddress;
      const clone = await ethers.getContractAt("NFTLaunchpadKit", cloneAddr);

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      await clone.setClaimConditions([
        {
          startTimestamp: now,
          maxSupply: 50,
          supplyClaimed: 0,
          quantityLimitPerWallet: 3,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther("0.02"),
          merkleRoot: ethers.ZeroHash,
          metadata: "",
        },
      ]);

      await clone.connect(user1).claim(2, [], { value: ethers.parseEther("0.04") });
      expect(await clone.ownerOf(0)).to.equal(user1.address);
      expect(await clone.ownerOf(1)).to.equal(user1.address);
    });

    it("multiple clones are independent", async () => {
      await factory.deployCollection("Collection A", "CA", 100, 5, ethers.parseEther("0.01"));
      await factory.deployCollection("Collection B", "CB", 200, 10, ethers.parseEther("0.02"));

      const collections = await factory.getAllCollections(0, 10);
      expect(collections.length).to.equal(2);

      const cloneA = await ethers.getContractAt("NFTLaunchpadKit", collections[0]);
      const cloneB = await ethers.getContractAt("NFTLaunchpadKit", collections[1]);

      expect(await cloneA.name()).to.equal("Collection A");
      expect(await cloneB.name()).to.equal("Collection B");
      expect(await cloneA.maxSupply()).to.equal(100);
      expect(await cloneB.maxSupply()).to.equal(200);

      // Minting on A doesn't affect B
      await cloneA.setSaleState(true);
      await cloneA.connect(user1).mint(1, { value: ethers.parseEther("0.01") });
      expect(await cloneA.ownerOf(0)).to.equal(user1.address);
      await expect(cloneB.ownerOf(0)).to.be.reverted;
    });
  });

  // ============================================================
  // Deterministic Deployment
  // ============================================================
  describe("Deterministic Deployment", () => {
    it("predicts address before deployment", async () => {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("my-collection"));
      const predicted = await factory.predictCollectionAddress(salt);

      const tx = await factory.deployCollectionDeterministic(
        salt,
        "Predicted",
        "PRD",
        100,
        5,
        ethers.parseEther("0.01"),
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log)?.name === "CollectionCloned";
        } catch {
          return false;
        }
      });
      const actual = factory.interface.parseLog(event!).args.cloneAddress;

      expect(actual).to.equal(predicted);
    });

    it("reverts on duplicate salt", async () => {
      const salt = ethers.keccak256(ethers.toUtf8Bytes("unique"));
      await factory.deployCollectionDeterministic(
        salt,
        "First",
        "F",
        100,
        5,
        ethers.parseEther("0.01"),
      );

      await expect(
        factory.deployCollectionDeterministic(
          salt,
          "Second",
          "S",
          100,
          5,
          ethers.parseEther("0.01"),
        ),
      ).to.be.reverted;
    });
  });

  // ============================================================
  // Owner Tracking
  // ============================================================
  describe("Owner Tracking", () => {
    it("tracks collections by owner", async () => {
      await factory.connect(user1).deployCollection("U1 Collection", "U1", 100, 5, ethers.parseEther("0.01"));
      await factory.connect(user1).deployCollection("U1 Collection 2", "U12", 200, 10, ethers.parseEther("0.02"));
      await factory.connect(user2).deployCollection("U2 Collection", "U2", 50, 3, ethers.parseEther("0.05"));

      const u1Collections = await factory.getCollectionsByOwner(user1.address);
      const u2Collections = await factory.getCollectionsByOwner(user2.address);

      expect(u1Collections.length).to.equal(2);
      expect(u2Collections.length).to.equal(1);
      expect(await factory.getCollectionCount()).to.equal(3);
    });
  });

  // ============================================================
  // Admin Functions
  // ============================================================
  describe("Admin Functions", () => {
    it("owner can update implementation", async () => {
      const NewImpl = await ethers.getContractFactory("NFTLaunchpadKit");
      const newImpl = await NewImpl.deploy(
        deployer.address,
        ethers.parseEther("0.1"),
        50,
        2,
      );
      await newImpl.waitForDeployment();

      await factory.setImplementation(await newImpl.getAddress());
      expect(await factory.implementation()).to.equal(await newImpl.getAddress());
    });

    it("non-owner cannot update implementation", async () => {
      await expect(
        factory.connect(user1).setImplementation(user1.address),
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("cannot set zero address as implementation", async () => {
      await expect(
        factory.setImplementation(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });

  // ============================================================
  // Gas Comparison
  // ============================================================
  describe("Gas Benchmarks", () => {
    it("clone deployment gas vs direct deployment gas", async () => {
      // Direct deployment
      const Impl = await ethers.getContractFactory("NFTLaunchpadKit");
      const directTx = await Impl.deploy(
        deployer.address,
        ethers.parseEther("0.01"),
        100,
        5,
      );
      const directReceipt = await directTx.deploymentTransaction()!.wait();
      const directGas = directReceipt!.gasUsed;

      // Clone deployment
      const cloneTx = await factory.deployCollection(
        "Clone Test",
        "CLN",
        100,
        5,
        ethers.parseEther("0.01"),
      );
      const cloneReceipt = await cloneTx.wait();
      const cloneGas = cloneReceipt!.gasUsed;

      console.log(`    Direct deployment: ${directGas} gas`);
      console.log(`    Clone deployment:  ${cloneGas} gas`);
      console.log(`    Savings:           ${directGas - cloneGas} gas (${((1 - Number(cloneGas) / Number(directGas)) * 100).toFixed(1)}%)`);

      // Clone should be significantly cheaper
      expect(cloneGas).to.be.lt(directGas / 5n);
    });
  });
});
