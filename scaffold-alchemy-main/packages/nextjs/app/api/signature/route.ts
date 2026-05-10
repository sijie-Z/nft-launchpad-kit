import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";
import { generateUID, signMintAuth712V2 } from "~~/utils/signature";

/**
 * POST /api/signature — Generate a V2 EIP-712 mint signature
 *
 * Body: {
 *   minter: string,          // 0x address of the minter
 *   quantity: number,         // number of NFTs to mint
 *   maxMint: number,          // max this signature allows
 *   deadline: number,         // unix timestamp expiry
 *   pricePerToken: number,    // price in wei (0 = use global mintPrice)
 *   contractAddress: string,  // NFTLaunchpadKit contract address
 *   chainId: number           // chain ID (e.g. 11155111 for Sepolia)
 * }
 *
 * Returns: { signature: string, uid: string, deadline: number }
 *
 * Requires: SIGNER_PRIVATE_KEY env var (the trusted signer's private key)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`sig:${ip}`, RATE_LIMITS.strict);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "Server not configured: SIGNER_PRIVATE_KEY missing" }, { status: 500 });
    }

    const body = await req.json();
    const { minter, quantity, maxMint, deadline, pricePerToken, contractAddress, chainId } = body;

    // Validation
    if (!minter || !quantity || !maxMint || !deadline || !contractAddress || !chainId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(minter)) {
      return NextResponse.json({ error: "Invalid minter address" }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
    }
    if (Number(deadline) < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
    }

    // Normalize private key (add 0x prefix if missing)
    const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(key as `0x${string}`);

    const uid = generateUID();
    const signature = await signMintAuth712V2(account, {
      minter,
      quantity: Number(quantity),
      maxMint: Number(maxMint),
      deadline: Number(deadline),
      pricePerToken: Number(pricePerToken || 0),
      uid,
      contractAddress,
      chainId: Number(chainId),
    });

    return NextResponse.json({
      signature,
      uid,
      deadline: Number(deadline),
      signer: account.address,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
