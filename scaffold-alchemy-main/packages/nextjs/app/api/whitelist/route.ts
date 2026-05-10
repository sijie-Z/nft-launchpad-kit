import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";

// GET /api/whitelist?collectionId=xxx — 查询白名单
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");

  if (!collectionId) {
    return NextResponse.json({ error: "collectionId required" }, { status: 400 });
  }

  const entries = await prisma.whitelistEntry.findMany({
    where: { collectionId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ entries, total: entries.length });
}

// POST /api/whitelist — 批量添加白名单
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`wl:${ip}`, RATE_LIMITS.normal);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { collectionId, entries } = body; // entries: [{ address, maxMint }]

  if (!collectionId || !entries || !Array.isArray(entries)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 批量 upsert
  const results = await Promise.all(
    entries.map((e: { address: string; maxMint?: number }) =>
      prisma.whitelistEntry.upsert({
        where: { collectionId_address: { collectionId, address: e.address.toLowerCase() } },
        update: { maxMint: e.maxMint || 1 },
        create: { collectionId, address: e.address.toLowerCase(), maxMint: e.maxMint || 1 },
      }),
    ),
  );

  return NextResponse.json({ success: true, count: results.length });
}

// DELETE /api/whitelist — 批量删除白名单
export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`wl-del:${ip}`, RATE_LIMITS.strict);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { collectionId, addresses } = body;

  if (!collectionId || !addresses || !Array.isArray(addresses)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await prisma.whitelistEntry.deleteMany({
    where: {
      collectionId,
      address: { in: addresses.map((a: string) => a.toLowerCase()) },
    },
  });

  return NextResponse.json({ success: true });
}
