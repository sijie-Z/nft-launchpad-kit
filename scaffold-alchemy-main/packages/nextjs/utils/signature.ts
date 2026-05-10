/**
 * 签名工具 — 后端签名授权铸造
 *
 * 四种签名方式：
 * 1. 传统签名（mintWithSignature）
 * 2. EIP-712 结构化签名（mintWithSignature712）← 推荐
 * 3. V2 传统签名 + UID + 自定义价格（mintWithSignatureV2）
 * 4. V2 EIP-712 签名 + UID + 自定义价格（mintWithSignature712V2）← 最推荐
 *
 * V2 新增：
 * - uid (bytes32): 每个签名全局唯一，防止任何重用（不仅仅是 per-address）
 * - pricePerToken: 签名者可为每个签名设置独立价格（0 = 使用全局 mintPrice）
 *
 * 使用方式（后端 API 或脚本中）：
 *
 *   import { signMintAuth712V2, generateUID } from "~~/utils/signature";
 *   import { privateKeyToAccount } from "viem/accounts";
 *
 *   const account = privateKeyToAccount("0x...");
 *   const uid = generateUID();
 *   const sig = await signMintAuth712V2(account, {
 *     minter: "0xUserAddress",
 *     quantity: 2,
 *     maxMint: 2,
 *     deadline: Math.floor(Date.now() / 1000) + 3600,
 *     pricePerToken: 0, // 0 = 使用全局 mintPrice
 *     uid,
 *     contractAddress: "0xContractAddress",
 *     chainId: 11155111,
 *   });
 *   // 返回 { signature, uid } → 给前端传给合约
 */
import { type Address, encodePacked, keccak256 } from "viem";
import { type PrivateKeyAccount } from "viem/accounts";

interface MintAuthParams {
  minter: string;
  quantity: number | bigint;
  maxMint: number | bigint;
  deadline: number | bigint;
  nonce: number | bigint;
  contractAddress: string;
  chainId: number | bigint;
}

interface MintAuthV2Params {
  minter: string;
  quantity: number | bigint;
  maxMint: number | bigint;
  deadline: number | bigint;
  pricePerToken: number | bigint;
  uid: `0x${string}`;
  contractAddress: string;
  chainId: number | bigint;
}

/**
 * Generate a unique signature UID (bytes32).
 * Uses crypto.getRandomValues for randomness.
 */
export function generateUID(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * EIP-712 结构化签名（推荐）
 * 钱包会显示可读的签名内容，更安全
 */
export async function signMintAuth712(account: PrivateKeyAccount, params: MintAuthParams): Promise<string> {
  const domain = {
    name: "NFT Launchpad Kit",
    version: "1",
    chainId: Number(params.chainId),
    verifyingContract: params.contractAddress as Address,
  } as const;

  const types = {
    MintAuthorization: [
      { name: "minter", type: "address" },
      { name: "quantity", type: "uint256" },
      { name: "maxMint", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  } as const;

  const value = {
    minter: params.minter as Address,
    quantity: BigInt(params.quantity),
    maxMint: BigInt(params.maxMint),
    deadline: BigInt(params.deadline),
    nonce: BigInt(params.nonce),
  };

  return account.signTypedData({
    domain,
    types,
    primaryType: "MintAuthorization",
    message: value,
  });
}

/**
 * 传统签名（mintWithSignature）
 * 兼容旧版合约
 */
export async function signMintAuth(account: PrivateKeyAccount, params: MintAuthParams): Promise<string> {
  const messageHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "uint256", "uint256", "address", "uint256"],
      [
        params.minter as Address,
        BigInt(params.quantity),
        BigInt(params.maxMint),
        BigInt(params.deadline),
        BigInt(params.nonce),
        params.contractAddress as Address,
        BigInt(params.chainId),
      ],
    ),
  );

  // signMessage 会自动加 "\x19Ethereum Signed Message:\n32" 前缀
  return account.signMessage({ message: { raw: messageHash } });
}

/**
 * 批量生成签名（给多个地址）
 * 适用于后端 API 一次性为多个用户生成签名
 */
export async function batchSignMintAuth712(
  account: PrivateKeyAccount,
  minterAddresses: string[],
  baseParams: Omit<MintAuthParams, "minter">,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const minter of minterAddresses) {
    const sig = await signMintAuth712(account, {
      ...baseParams,
      minter,
    });
    results.set(minter.toLowerCase(), sig);
  }

  return results;
}

// ============================================================
// V2 — UID + Per-Signature Pricing
// ============================================================

/**
 * V2 EIP-712 结构化签名（最推荐）
 * - uid: 每个签名全局唯一，防止重用
 * - pricePerToken: 签名者可设置独立价格（0 = 使用全局 mintPrice）
 */
export async function signMintAuth712V2(
  account: PrivateKeyAccount,
  params: MintAuthV2Params,
): Promise<string> {
  const domain = {
    name: "NFT Launchpad Kit",
    version: "1",
    chainId: Number(params.chainId),
    verifyingContract: params.contractAddress as Address,
  } as const;

  const types = {
    MintAuthorizationV2: [
      { name: "minter", type: "address" },
      { name: "quantity", type: "uint256" },
      { name: "maxMint", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "pricePerToken", type: "uint256" },
      { name: "uid", type: "bytes32" },
    ],
  } as const;

  const value = {
    minter: params.minter as Address,
    quantity: BigInt(params.quantity),
    maxMint: BigInt(params.maxMint),
    deadline: BigInt(params.deadline),
    pricePerToken: BigInt(params.pricePerToken),
    uid: params.uid,
  };

  return account.signTypedData({
    domain,
    types,
    primaryType: "MintAuthorizationV2",
    message: value,
  });
}

/**
 * V2 传统签名 + UID + 自定义价格
 */
export async function signMintAuthV2(
  account: PrivateKeyAccount,
  params: MintAuthV2Params,
): Promise<string> {
  const messageHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "uint256", "uint256", "bytes32", "address", "uint256"],
      [
        params.minter as Address,
        BigInt(params.quantity),
        BigInt(params.maxMint),
        BigInt(params.deadline),
        BigInt(params.pricePerToken),
        params.uid,
        params.contractAddress as Address,
        BigInt(params.chainId),
      ],
    ),
  );

  return account.signMessage({ message: { raw: messageHash } });
}

/**
 * V2 批量签名（每个地址生成独立 UID）
 */
export async function batchSignMintAuth712V2(
  account: PrivateKeyAccount,
  minterAddresses: string[],
  baseParams: Omit<MintAuthV2Params, "minter" | "uid">,
): Promise<Map<string, { signature: string; uid: `0x${string}` }>> {
  const results = new Map<string, { signature: string; uid: `0x${string}` }>();

  for (const minter of minterAddresses) {
    const uid = generateUID();
    const sig = await signMintAuth712V2(account, {
      ...baseParams,
      minter,
      uid,
    });
    results.set(minter.toLowerCase(), { signature: sig, uid });
  }

  return results;
}
