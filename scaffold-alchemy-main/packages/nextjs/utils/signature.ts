/**
 * 签名工具 — 后端签名授权铸造
 *
 * 两种签名方式：
 * 1. 传统签名（mintWithSignature）
 * 2. EIP-712 结构化签名（mintWithSignature712）← 推荐
 *
 * 使用方式（后端 API 或脚本中）：
 *
 *   import { signMintAuth712, signMintAuth } from "~~/utils/signature";
 *   import { privateKeyToAccount } from "viem/accounts";
 *
 *   const account = privateKeyToAccount("0x...");
 *   const sig = await signMintAuth712(account, {
 *     minter: "0xUserAddress",
 *     quantity: 2,
 *     maxMint: 5,
 *     deadline: Math.floor(Date.now() / 1000) + 3600,
 *     nonce: 0, // 从合约 signatureNonce(user) 读取
 *     contractAddress: "0xContractAddress",
 *     chainId: 11155111,
 *   });
 *   // 返回 signature hex string → 给前端传给合约
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
