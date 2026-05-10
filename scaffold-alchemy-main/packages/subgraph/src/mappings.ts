import {
  BigInt,
  Bytes,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  CollectionCloned,
} from "../generated/NFTLaunchpadKitFactory/NFTLaunchpadKitFactory";
import {
  Transfer,
  MintedBySignature,
  MintedByAllowlist,
  MintedByAuction,
  MintedByERC20,
  ClaimConditionsSet,
  ClaimConditionUpdated,
  PhaseAdvanced,
  Claimed,
  FundsSplit,
  Withdraw,
  TokenWithdrawn,
  SaleStateChanged,
  AllowlistSaleStateChanged,
  MintPriceUpdated,
  MaxPerWalletUpdated,
  MerkleRootUpdated,
  DutchAuctionConfigured,
  TrustedSignerUpdated,
  RoyaltyUpdated,
  ERC20TokenAccepted,
  BaseURIUpdated,
  PreRevealURIUpdated,
  PausedStateChanged,
  DelayedRevealSet,
  DelayedRevealRevealed,
  OwnershipTransferred,
} from "../generated/NFTLaunchpadKit/NFTLaunchpadKit";
import {
  NFTLaunchpadKitClone,
} from "../generated/templates";
import {
  Collection,
  MintRecord,
  Wallet,
  DailySnapshot,
  PlatformStats,
  ClaimPhase,
  FundSplit,
  Withdrawal,
  ConfigChange,
} from "../generated/schema";
import {
  ZERO_ADDRESS,
  PLATFORM_STATS_ID,
  getOrCreateCollection,
  getOrCreateWallet,
  getOrCreateDailySnapshot,
  getOrCreatePlatformStats,
} from "./helpers";


// ============================================================
// Factory Events
// ============================================================

export function handleCollectionCloned(event: CollectionCloned): void {
  let collectionAddress = event.params.cloneAddress;
  let collection = getOrCreateCollection(collectionAddress);
  collection.name = event.params.name;
  collection.symbol = event.params.symbol;
  collection.owner = event.params.owner;
  collection.maxSupply = event.params.maxSupply;
  collection.deployBlock = event.block.number;
  collection.deployTimestamp = event.block.timestamp;
  collection.txHash = event.transaction.hash;
  collection.save();

  // Create data source for the clone to track its events
  NFTLaunchpadKitClone.create(collectionAddress);

  // Update platform stats
  let stats = getOrCreatePlatformStats();
  stats.totalCollections = stats.totalCollections.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

// ============================================================
// Transfer — track mints (from == zero address)
// ============================================================

export function handleTransfer(event: Transfer): void {
  let from = event.params.from;
  let to = event.params.to;
  let tokenId = event.params.tokenId;

  // Only track mints (from == zero address)
  if (from.equals(ZERO_ADDRESS)) {
    let collectionAddress = event.address;
    let collection = getOrCreateCollection(collectionAddress);

    // Update collection stats
    collection.totalMinted = collection.totalMinted.plus(BigInt.fromI32(1));
    collection.mintTxCount = collection.mintTxCount.plus(BigInt.fromI32(1));
    collection.save();

    // Update wallet
    let wallet = getOrCreateWallet(to);
    wallet.totalMinted = wallet.totalMinted.plus(BigInt.fromI32(1));
    wallet.lastMintAt = event.block.timestamp;
    if (wallet.firstMintAt.equals(BigInt.zero())) {
      wallet.firstMintAt = event.block.timestamp;
    }
    wallet.save();

    // Update daily snapshot
    let snapshot = getOrCreateDailySnapshot(collectionAddress, event.block.timestamp);
    snapshot.mintCount = snapshot.mintCount.plus(BigInt.fromI32(1));
    snapshot.txCount = snapshot.txCount.plus(BigInt.fromI32(1));
    snapshot.save();

    // Update platform stats
    let stats = getOrCreatePlatformStats();
    stats.totalMinted = stats.totalMinted.plus(BigInt.fromI32(1));
    stats.totalMintTxs = stats.totalMintTxs.plus(BigInt.fromI32(1));
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

// ============================================================
// Mint-Type Events
// ============================================================

export function handleMintedBySignature(event: MintedBySignature): void {
  let collection = getOrCreateCollection(event.address);
  collection.mintTxCount = collection.mintTxCount.plus(BigInt.fromI32(1));
  collection.save();

  let recordId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let record = new MintRecord(recordId);
  record.collection = event.address;
  record.minter = event.params.minter;
  record.tokenId = BigInt.zero(); // Will be set by Transfer
  record.quantity = event.params.quantity;
  record.paymentType = "eth";
  record.mintType = "signature";
  record.ethPaid = BigInt.zero(); // Signature mints may be free
  record.tokenPaid = BigInt.zero();
  record.txHash = event.transaction.hash;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();
}

export function handleMintedByAllowlist(event: MintedByAllowlist): void {
  let collection = getOrCreateCollection(event.address);
  collection.mintTxCount = collection.mintTxCount.plus(BigInt.fromI32(1));
  collection.save();

  let recordId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let record = new MintRecord(recordId);
  record.collection = event.address;
  record.minter = event.params.minter;
  record.tokenId = BigInt.zero();
  record.quantity = event.params.quantity;
  record.paymentType = "eth";
  record.mintType = "allowlist";
  record.ethPaid = collection.mintPrice.times(event.params.quantity);
  record.tokenPaid = BigInt.zero();
  record.txHash = event.transaction.hash;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Update revenue
  collection.totalRevenue = collection.totalRevenue.plus(record.ethPaid);
  collection.save();

  // Update daily snapshot
  let snapshot = getOrCreateDailySnapshot(event.address, event.block.timestamp);
  snapshot.ethVolume = snapshot.ethVolume.plus(record.ethPaid);
  snapshot.save();

  // Update platform stats
  let stats = getOrCreatePlatformStats();
  stats.totalEthVolume = stats.totalEthVolume.plus(record.ethPaid);
  stats.save();
}

export function handleMintedByAuction(event: MintedByAuction): void {
  let collection = getOrCreateCollection(event.address);
  collection.mintTxCount = collection.mintTxCount.plus(BigInt.fromI32(1));
  collection.save();

  let recordId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let record = new MintRecord(recordId);
  record.collection = event.address;
  record.minter = event.params.minter;
  record.tokenId = BigInt.zero();
  record.quantity = event.params.quantity;
  record.paymentType = "eth";
  record.mintType = "auction";
  record.ethPaid = event.params.price.times(event.params.quantity);
  record.tokenPaid = BigInt.zero();
  record.txHash = event.transaction.hash;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Update revenue
  collection.totalRevenue = collection.totalRevenue.plus(record.ethPaid);
  collection.save();

  let snapshot = getOrCreateDailySnapshot(event.address, event.block.timestamp);
  snapshot.ethVolume = snapshot.ethVolume.plus(record.ethPaid);
  snapshot.save();

  let stats = getOrCreatePlatformStats();
  stats.totalEthVolume = stats.totalEthVolume.plus(record.ethPaid);
  stats.save();
}

export function handleMintedByERC20(event: MintedByERC20): void {
  let collection = getOrCreateCollection(event.address);
  collection.mintTxCount = collection.mintTxCount.plus(BigInt.fromI32(1));
  collection.save();

  let recordId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let record = new MintRecord(recordId);
  record.collection = event.address;
  record.minter = event.params.minter;
  record.tokenId = BigInt.zero();
  record.quantity = event.params.quantity;
  record.paymentType = "erc20";
  record.mintType = "erc20";
  record.ethPaid = BigInt.zero();
  record.tokenPaid = event.params.tokenAmount;
  record.txHash = event.transaction.hash;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();
}

// ============================================================
// Claim Conditions Events
// ============================================================

export function handleClaimConditionsSet(event: ClaimConditionsSet): void {
  // Phase count is emitted; individual phases are set via setClaimConditions
  // We just log a config change
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "claim_conditions_set";
  change.newValue = event.params.phaseCount.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleClaimConditionUpdated(event: ClaimConditionUpdated): void {
  let collectionAddress = event.address;
  let phaseId = event.params.phaseId;

  // Create or update ClaimPhase entity
  let claimPhaseId = Bytes.fromHexString(
    collectionAddress.toHexString() + "-" + phaseId.toString()
  );
  let phase = ClaimPhase.load(claimPhaseId);
  if (phase == null) {
    phase = new ClaimPhase(claimPhaseId);
    phase.collection = collectionAddress;
    phase.phaseId = phaseId;
    phase.startTimestamp = BigInt.zero();
    phase.maxSupply = BigInt.zero();
    phase.supplyClaimed = BigInt.zero();
    phase.quantityLimitPerWallet = BigInt.zero();
    phase.currency = ZERO_ADDRESS;
    phase.pricePerToken = BigInt.zero();
    phase.merkleRoot = Bytes.fromHexString(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    phase.isActive = false;
  }
  phase.updatedAt = event.block.timestamp;
  phase.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = collectionAddress;
  change.changeType = "claim_phase_updated";
  change.newValue = phaseId.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handlePhaseAdvanced(event: PhaseAdvanced): void {
  // Mark old phase as inactive, new phase as active
  let collectionAddress = event.address;

  let oldPhaseId = Bytes.fromHexString(
    collectionAddress.toHexString() + "-" + event.params.fromPhase.toString()
  );
  let oldPhase = ClaimPhase.load(oldPhaseId);
  if (oldPhase != null) {
    oldPhase.isActive = false;
    oldPhase.save();
  }

  let newPhaseId = Bytes.fromHexString(
    collectionAddress.toHexString() + "-" + event.params.toPhase.toString()
  );
  let newPhase = ClaimPhase.load(newPhaseId);
  if (newPhase == null) {
    newPhase = new ClaimPhase(newPhaseId);
    newPhase.collection = collectionAddress;
    newPhase.phaseId = event.params.toPhase;
    newPhase.startTimestamp = BigInt.zero();
    newPhase.maxSupply = BigInt.zero();
    newPhase.supplyClaimed = BigInt.zero();
    newPhase.quantityLimitPerWallet = BigInt.zero();
    newPhase.currency = ZERO_ADDRESS;
    newPhase.pricePerToken = BigInt.zero();
    newPhase.merkleRoot = Bytes.fromHexString(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    newPhase.updatedAt = event.block.timestamp;
  }
  newPhase.isActive = true;
  newPhase.save();
}

export function handleClaimed(event: Claimed): void {
  let collection = getOrCreateCollection(event.address);
  collection.totalMinted = collection.totalMinted.plus(event.params.quantity);
  collection.mintTxCount = collection.mintTxCount.plus(BigInt.fromI32(1));
  collection.totalRevenue = collection.totalRevenue.plus(event.params.totalPaid);
  collection.save();

  let recordId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let record = new MintRecord(recordId);
  record.collection = event.address;
  record.minter = event.params.claimer;
  record.tokenId = BigInt.zero();
  record.quantity = event.params.quantity;
  record.paymentType = event.params.totalPaid.gt(BigInt.zero()) ? "eth" : "free";
  record.mintType = "claim";
  record.ethPaid = event.params.totalPaid;
  record.tokenPaid = BigInt.zero();
  record.phaseId = event.params.phaseId;
  record.txHash = event.transaction.hash;
  record.blockNumber = event.block.number;
  record.timestamp = event.block.timestamp;
  record.save();

  // Update claim phase supply
  let claimPhaseId = Bytes.fromHexString(
    event.address.toHexString() + "-" + event.params.phaseId.toString()
  );
  let phase = ClaimPhase.load(claimPhaseId);
  if (phase != null) {
    phase.supplyClaimed = phase.supplyClaimed.plus(event.params.quantity);
    phase.save();
  }

  // Update wallet
  let wallet = getOrCreateWallet(event.params.claimer);
  wallet.totalMinted = wallet.totalMinted.plus(event.params.quantity);
  wallet.totalEthSpent = wallet.totalEthSpent.plus(event.params.totalPaid);
  wallet.lastMintAt = event.block.timestamp;
  if (wallet.firstMintAt.equals(BigInt.zero())) {
    wallet.firstMintAt = event.block.timestamp;
  }
  wallet.save();

  // Update daily snapshot
  let snapshot = getOrCreateDailySnapshot(event.address, event.block.timestamp);
  snapshot.mintCount = snapshot.mintCount.plus(event.params.quantity);
  snapshot.ethVolume = snapshot.ethVolume.plus(event.params.totalPaid);
  snapshot.txCount = snapshot.txCount.plus(BigInt.fromI32(1));
  snapshot.save();

  // Update platform stats
  let stats = getOrCreatePlatformStats();
  stats.totalMinted = stats.totalMinted.plus(event.params.quantity);
  stats.totalEthVolume = stats.totalEthVolume.plus(event.params.totalPaid);
  stats.totalMintTxs = stats.totalMintTxs.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

// ============================================================
// Fund Events
// ============================================================

export function handleFundsSplit(event: FundsSplit): void {
  let splitId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let split = new FundSplit(splitId);
  split.collection = event.address;
  split.recipients = event.params.recipients.map<Bytes>((a: Bytes) => a);
  split.amounts = event.params.amounts;

  let total = BigInt.zero();
  for (let i = 0; i < event.params.amounts.length; i++) {
    total = total.plus(event.params.amounts[i]);
  }
  split.totalAmount = total;
  split.txHash = event.transaction.hash;
  split.blockNumber = event.block.number;
  split.timestamp = event.block.timestamp;
  split.save();

  // Update collection withdrawn amount
  let collection = getOrCreateCollection(event.address);
  collection.totalWithdrawn = collection.totalWithdrawn.plus(total);
  collection.save();
}

export function handleWithdraw(event: Withdraw): void {
  let withdrawalId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.collection = event.address;
  withdrawal.to = event.params.to;
  withdrawal.amount = event.params.amount;
  withdrawal.withdrawalType = "eth";
  withdrawal.txHash = event.transaction.hash;
  withdrawal.blockNumber = event.block.number;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.save();

  let collection = getOrCreateCollection(event.address);
  collection.totalWithdrawn = collection.totalWithdrawn.plus(event.params.amount);
  collection.save();
}

export function handleTokenWithdrawn(event: TokenWithdrawn): void {
  let withdrawalId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.collection = event.address;
  withdrawal.to = event.params.to;
  withdrawal.amount = event.params.amount;
  withdrawal.withdrawalType = "erc20";
  withdrawal.token = event.params.token;
  withdrawal.txHash = event.transaction.hash;
  withdrawal.blockNumber = event.block.number;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.save();
}

// ============================================================
// Configuration Events
// ============================================================

export function handleSaleStateChanged(event: SaleStateChanged): void {
  let collection = getOrCreateCollection(event.address);
  collection.saleIsActive = event.params.isActive;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "sale";
  change.newValue = event.params.isActive ? "true" : "false";
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleAllowlistSaleStateChanged(event: AllowlistSaleStateChanged): void {
  let collection = getOrCreateCollection(event.address);
  collection.allowlistSaleIsActive = event.params.isActive;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "allowlist";
  change.newValue = event.params.isActive ? "true" : "false";
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleMintPriceUpdated(event: MintPriceUpdated): void {
  let collection = getOrCreateCollection(event.address);
  let oldPrice = collection.mintPrice;
  collection.mintPrice = event.params.newPrice;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "price";
  change.newValue = event.params.newPrice.toString();
  change.oldValue = oldPrice.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleMaxPerWalletUpdated(event: MaxPerWalletUpdated): void {
  let collection = getOrCreateCollection(event.address);
  let oldLimit = collection.maxPerWallet;
  collection.maxPerWallet = event.params.newLimit;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "limit";
  change.newValue = event.params.newLimit.toString();
  change.oldValue = oldLimit.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleMerkleRootUpdated(event: MerkleRootUpdated): void {
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "merkle";
  change.newValue = event.params.newRoot.toHexString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleDutchAuctionConfigured(event: DutchAuctionConfigured): void {
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "auction";
  change.newValue =
    event.params.startPrice.toString() +
    "," +
    event.params.endPrice.toString() +
    "," +
    event.params.startTime.toString() +
    "," +
    event.params.duration.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleTrustedSignerUpdated(event: TrustedSignerUpdated): void {
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "signer";
  change.newValue = event.params.newSigner.toHexString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleRoyaltyUpdated(event: RoyaltyUpdated): void {
  let collection = getOrCreateCollection(event.address);
  collection.royaltyReceiver = event.params.receiver;
  collection.royaltyBps = event.params.feeNumerator;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "royalty";
  change.newValue =
    event.params.receiver.toHexString() + "," + event.params.feeNumerator.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleERC20TokenAccepted(event: ERC20TokenAccepted): void {
  let collection = getOrCreateCollection(event.address);
  collection.acceptedToken = event.params.token;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "erc20";
  change.newValue =
    event.params.token.toHexString() + "," + event.params.unitPrice.toString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleBaseURIUpdated(event: BaseURIUpdated): void {
  let collection = getOrCreateCollection(event.address);
  collection.baseURI = event.params.newBaseURI;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "baseuri";
  change.newValue = event.params.newBaseURI;
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handlePreRevealURIUpdated(event: PreRevealURIUpdated): void {
  let collection = getOrCreateCollection(event.address);
  collection.preRevealURI = event.params.preRevealURI;
  collection.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "prereveal";
  change.newValue = event.params.preRevealURI;
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handlePausedStateChanged(event: PausedStateChanged): void {
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "pause";
  change.newValue = event.params.isPaused ? "true" : "false";
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

// ============================================================
// Delayed Reveal Events
// ============================================================

export function handleDelayedRevealSet(event: DelayedRevealSet): void {
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "delayed_reveal_set";
  change.newValue = event.params.hashedUri.toHexString();
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleDelayedRevealRevealed(event: DelayedRevealRevealed): void {
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ConfigChange(changeId);
  change.collection = event.address;
  change.changeType = "delayed_reveal_revealed";
  change.newValue = event.params.revealedBaseUri;
  change.txHash = event.transaction.hash;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let collection = getOrCreateCollection(event.address);
  collection.owner = event.params.newOwner;
  collection.save();
}
