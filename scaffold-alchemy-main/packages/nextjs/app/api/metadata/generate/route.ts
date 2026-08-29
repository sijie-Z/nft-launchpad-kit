import { NextRequest, NextResponse } from "next/server";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";
import { generateMetadata, pinMetadataFolder } from "~~/utils/metadata";

/**
 * POST /api/metadata/generate — AI metadata pipeline (#36)
 *
 * Body: {
 *   name: string,            // collection name
 *   description?: string,    // shared description
 *   imageUrl: string,        // image URL, supports {id} placeholder
 *   count: number,           // 1..10000 tokens
 *   attributes?: { trait_type, value }[],
 *   dryRun?: boolean         // generate only, no upload (returns preview)
 * }
 *
 * Returns: { baseUri: string, count: number, mock?: boolean, dryRun?: boolean, preview?: [...] }
 *
 * Upload strategy: one Pinata v3 request pins the whole folder
 * (wrap_with_directory), so 1000 tokens upload in seconds.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`meta:${ip}`, RATE_LIMITS.normal);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const body = await req.json();
    const { name, description, imageUrl, count, attributes, dryRun } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }
    if (!/^(https?:\/\/|ipfs:\/\/)/.test(imageUrl)) {
      return NextResponse.json({ error: "imageUrl must be http(s) or ipfs://" }, { status: 400 });
    }
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 10000) {
      return NextResponse.json({ error: "count must be an integer 1..10000" }, { status: 400 });
    }
    if (attributes && !Array.isArray(attributes)) {
      return NextResponse.json({ error: "attributes must be an array" }, { status: 400 });
    }

    const tokens = generateMetadata({
      name: String(name).trim(),
      description: description ? String(description) : undefined,
      imageUrl: String(imageUrl),
      count: n,
      attributes,
    });

    if (dryRun) {
      return NextResponse.json({
        count: tokens.length,
        dryRun: true,
        preview: tokens.slice(0, 3),
      });
    }

    // Real upload path — Pinata v3 (JWT). Without keys we return a mock CID
    // so the flow is testable in dev (same pattern as /api/ipfs).
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      const mockCid = `QmMock${Date.now().toString(36)}`;
      return NextResponse.json({
        baseUri: `ipfs://${mockCid}/`,
        count: tokens.length,
        mock: true,
      });
    }

    const { baseUri } = await pinMetadataFolder(tokens, String(name).trim(), jwt);
    return NextResponse.json({ baseUri, count: tokens.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
