/**
 * Merkle Tree 工具 — 白名单 proof 生成
 *
 * 支持两种模式：
 *   1. 简单模式：keccak256(encodePacked(address)) — 每个地址相同限额
 *   2. 分级模式：keccak256(encodePacked(address, maxQty)) — 每个地址不同限额
 *      参考 thirdweb 的 ClaimCondition Merkle leaf 格式
 *
 * 使用方式：
 *   import { generateMerkleTree, getProof } from "~~/utils/merkle";
 *
 *   // 简单模式
 *   const tree = generateMerkleTree(["0xAddr1", "0xAddr2"]);
 *
 *   // 分级模式（VIP 3个，普通 1个）
 *   const tree = generateMerkleTreeWithQty([
 *     { address: "0xVIP", maxQty: 3 },
 *     { address: "0xNormal", maxQty: 1 },
 *   ]);
 *
 * 依赖：merkletreejs + viem（项目已有）
 */
import { MerkleTree } from "merkletreejs";
import { encodePacked, keccak256 } from "viem";

export interface MerkleData {
  tree: MerkleTree;
  root: string;
  leaves: string[];
  addresses: string[];
}

export interface AllowlistEntry {
  address: string;
  maxQty: number;
}

/**
 * 从地址列表生成 Merkle Tree（简单模式，所有地址相同限额）
 * @param addresses 白名单地址数组（大小写不敏感，会统一转小写）
 * @returns MerkleData 包含树、根、叶子
 */
export function generateMerkleTree(addresses: string[]): MerkleData {
  const normalized = [...new Set(addresses.map(a => a.toLowerCase().trim()))];
  const leaves = normalized.map(addr => keccak256(encodePacked(["address"], [addr as `0x${string}`])));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true, hashLeaves: false });
  const root = tree.getHexRoot();
  return { tree, root, leaves, addresses: normalized };
}

/**
 * 从分级白名单生成 Merkle Tree（每个地址可有不同铸造限额）
 * 参考 thirdweb 的 ClaimCondition Merkle leaf 格式：
 *   leaf = keccak256(abi.encodePacked(address, maxQuantityPerWallet))
 *
 * @param entries 白名单条目数组
 * @returns MerkleData 包含树、根、叶子
 */
export function generateMerkleTreeWithQty(entries: AllowlistEntry[]): MerkleData {
  const normalized = entries.map(e => ({
    address: e.address.toLowerCase().trim(),
    maxQty: e.maxQty,
  }));

  // Deduplicate by address (keep last entry if duplicates)
  const unique = new Map<string, number>();
  for (const e of normalized) {
    unique.set(e.address, e.maxQty);
  }

  const addresses = [...unique.keys()];
  const leaves = addresses.map(addr => {
    const qty = unique.get(addr)!;
    return keccak256(encodePacked(["address", "uint256"], [addr as `0x${string}`, BigInt(qty)]));
  });

  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true, hashLeaves: false });
  const root = tree.getHexRoot();
  return { tree, root, leaves, addresses };
}

/**
 * 为指定地址生成 Merkle Proof（简单模式）
 */
export function getProof(data: MerkleData, address: string): string[] {
  const leaf = keccak256(encodePacked(["address"], [address.toLowerCase().trim() as `0x${string}`]));
  return data.tree.getHexProof(leaf);
}

/**
 * 为指定地址生成 Merkle Proof（分级模式）
 */
export function getProofWithQty(data: MerkleData, address: string, maxQty: number): string[] {
  const leaf = keccak256(
    encodePacked(["address", "uint256"], [address.toLowerCase().trim() as `0x${string}`, BigInt(maxQty)]),
  );
  return data.tree.getHexProof(leaf);
}

/**
 * 验证某个地址是否在白名单中
 */
export function isWhitelisted(data: MerkleData, address: string): boolean {
  const leaf = keccak256(encodePacked(["address"], [address.toLowerCase().trim() as `0x${string}`]));
  return data.leaves.includes(leaf);
}

/**
 * 从 CSV 格式解析地址列表
 * 支持格式：
 *   0xAddr1,0xAddr2,0xAddr3
 *   0xAddr1\n0xAddr2\n0xAddr3
 *   0xAddr1, 0xAddr2, 0xAddr3
 */
export function parseAddressList(input: string): string[] {
  return input
    .split(/[,\n\r]+/)
    .map(s => s.trim())
    .filter(s => /^0x[a-fA-F0-9]{40}$/.test(s));
}

/**
 * 从 CSV 格式解析分级白名单
 * 支持格式：
 *   0xAddr1,3\n0xAddr2,1\n0xAddr3,5
 *   0xAddr1,3,0xAddr2,1
 * 即 address,maxQty 每行一对
 */
export function parseAllowlistWithQty(input: string): AllowlistEntry[] {
  const lines = input.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
  const entries: AllowlistEntry[] = [];

  for (const line of lines) {
    // Try "address,qty" format
    const parts = line.split(",").map(s => s.trim());
    if (parts.length >= 2 && /^0x[a-fA-F0-9]{40}$/.test(parts[0])) {
      const qty = parseInt(parts[1], 10);
      if (!isNaN(qty) && qty > 0) {
        entries.push({ address: parts[0], maxQty: qty });
        continue;
      }
    }
    // Fallback: just address (default qty = 1)
    if (/^0x[a-fA-F0-9]{40}$/.test(parts[0])) {
      entries.push({ address: parts[0], maxQty: 1 });
    }
  }

  return entries;
}
