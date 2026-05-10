import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";
import { type AllowlistEntry, generateMerkleTreeWithQty, getProofWithQty } from "~~/utils/merkle";

/**
 * POST /api/whitelist/proof — Generate a Merkle proof for a given address
 *
 * Body: {
 *   collectionId: string,  // collection ID from the database
 *   address: string        // wallet address to generate proof for
 * }
 *
 * Returns: {
 *   proof: string[],       // Merkle proof array
 *   maxQty: number,        // max mint quantity for this address
 *   root: string,          // Merkle root
 *   isWhitelisted: boolean // whether the address is in the whitelist
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`proof:${ip}`, RATE_LIMITS.strict);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const body = await req.json();
    const { collectionId, address } = body;

    if (!collectionId || !address) {
      return NextResponse.json({ error: "collectionId and address are required" }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Fetch whitelist entries for this collection
    const entries = await prisma.whitelistEntry.findMany({
      where: { collectionId },
    });

    if (entries.length === 0) {
      return NextResponse.json({
        proof: [],
        maxQty: 0,
        root: "0x0000000000000000000000000000000000000000000000000000000000000000",
        isWhitelisted: false,
      });
    }

    // Build Merkle tree
    const allowlist: AllowlistEntry[] = entries.map((e: { address: string; maxMint: number }) => ({
      address: e.address,
      maxQty: e.maxMint,
    }));

    const treeData = generateMerkleTreeWithQty(allowlist);

    // Find the entry for this address
    const normalizedAddr = address.toLowerCase().trim();
    const entry = entries.find((e: { address: string }) => e.address.toLowerCase() === normalizedAddr);

    if (!entry) {
      return NextResponse.json({
        proof: [],
        maxQty: 0,
        root: treeData.root,
        isWhitelisted: false,
      });
    }

    // Generate proof
    const proof = getProofWithQty(treeData, normalizedAddr, entry.maxMint);

    return NextResponse.json({
      proof,
      maxQty: entry.maxMint,
      root: treeData.root,
      isWhitelisted: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
