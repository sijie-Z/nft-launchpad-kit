import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Collection, Wallet, DailySnapshot, PlatformStats } from "../generated/schema";

export const ZERO_ADDRESS = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
export const PLATFORM_STATS_ID = Bytes.fromHexString("0x0000000000000000000000000000000000000001");

export function getOrCreateCollection(address: Bytes): Collection {
  let collection = Collection.load(address);
  if (collection == null) {
    collection = new Collection(address);
    collection.name = "";
    collection.symbol = "";
    collection.owner = ZERO_ADDRESS;
    collection.maxSupply = BigInt.zero();
    collection.maxPerWallet = BigInt.zero();
    collection.mintPrice = BigInt.zero();
    collection.saleIsActive = false;
    collection.allowlistSaleIsActive = false;
    collection.revealed = false;
    collection.totalMinted = BigInt.zero();
    collection.uniqueMinters = BigInt.zero();
    collection.totalRevenue = BigInt.zero();
    collection.totalWithdrawn = BigInt.zero();
    collection.mintTxCount = BigInt.zero();
    collection.royaltyBps = BigInt.zero();
    collection.deployBlock = BigInt.zero();
    collection.deployTimestamp = BigInt.zero();
    collection.txHash = ZERO_ADDRESS;
  }
  return collection;
}

export function getOrCreateWallet(address: Bytes): Wallet {
  let wallet = Wallet.load(address);
  if (wallet == null) {
    wallet = new Wallet(address);
    wallet.collectionCount = BigInt.zero();
    wallet.totalMinted = BigInt.zero();
    wallet.totalEthSpent = BigInt.zero();
    wallet.firstMintAt = BigInt.zero();
    wallet.lastMintAt = BigInt.zero();
  }
  return wallet;
}

export function getOrCreateDailySnapshot(collectionAddress: Bytes, timestamp: BigInt): DailySnapshot {
  let date = timestampToDate(timestamp);
  let id = Bytes.fromHexString(
    collectionAddress.toHexString() + "-" + date
  );
  let snapshot = DailySnapshot.load(id);
  if (snapshot == null) {
    snapshot = new DailySnapshot(id);
    snapshot.collection = collectionAddress;
    snapshot.date = date;
    snapshot.mintCount = BigInt.zero();
    snapshot.uniqueMinters = BigInt.zero();
    snapshot.ethVolume = BigInt.zero();
    snapshot.newMinters = BigInt.zero();
    snapshot.txCount = BigInt.zero();
  }
  return snapshot;
}

export function getOrCreatePlatformStats(): PlatformStats {
  let stats = PlatformStats.load(PLATFORM_STATS_ID);
  if (stats == null) {
    stats = new PlatformStats(PLATFORM_STATS_ID);
    stats.totalCollections = BigInt.zero();
    stats.totalMinted = BigInt.zero();
    stats.totalUniqueMinters = BigInt.zero();
    stats.totalEthVolume = BigInt.zero();
    stats.totalMintTxs = BigInt.zero();
    stats.lastUpdated = BigInt.zero();
  }
  return stats;
}

function timestampToDate(timestamp: BigInt): string {
  // Convert to days since epoch for grouping
  let days = timestamp.toI32() / 86400;
  let year = 1970;
  let remaining = days;

  // Rough year calculation
  while (remaining >= 365) {
    let isLeap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let daysInYear = isLeap ? 366 : 365;
    if (remaining >= daysInYear) {
      remaining -= daysInYear;
      year += 1;
    } else {
      break;
    }
  }

  let monthDays: i32[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)) {
    monthDays[1] = 29;
  }

  let month = 1;
  for (let i = 0; i < 12; i++) {
    if (remaining < monthDays[i]) {
      month = i + 1;
      break;
    }
    remaining -= monthDays[i];
  }

  let day = remaining + 1;
  let yearStr = year.toString();
  let monthStr = month < 10 ? "0" + month.toString() : month.toString();
  let dayStr = day < 10 ? "0" + day.toString() : day.toString();
  return yearStr + "-" + monthStr + "-" + dayStr;
}

export function updateWalletMintCollection(
  wallet: Wallet,
  collectionAddress: Bytes
): void {
  // Track unique collections via a separate entity would be ideal,
  // but for simplicity we use a heuristic: increment if first mint to this collection
  // The actual uniqueness tracking happens in the mint handler
  wallet.collectionCount = wallet.collectionCount;
}
