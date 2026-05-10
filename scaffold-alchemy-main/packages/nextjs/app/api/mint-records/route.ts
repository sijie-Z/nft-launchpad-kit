import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";

// GET /api/mint-records — 查询铸造记录
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");
  const minter = searchParams.get("minter");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {};
  if (collectionId) where.collectionId = collectionId;
  if (minter) where.minterAddress = minter.toLowerCase();

  const [records, total] = await Promise.all([
    prisma.mintRecord.findMany({
      where,
      include: { collection: { select: { name: true, contractAddress: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mintRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, limit });
}

// POST /api/mint-records — 记录铸造（前端铸造成功后调用）
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`mint:${ip}`, RATE_LIMITS.normal);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { txHash, minterAddress, tokenId, quantity, totalPaid, mintMode, collectionId, chainId } = body;

  if (!txHash || !minterAddress || !quantity || !collectionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 自动创建用户
  let user = await prisma.user.findUnique({ where: { address: minterAddress.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({ data: { address: minterAddress.toLowerCase() } });
  }

  const record = await prisma.mintRecord.create({
    data: {
      txHash,
      minterAddress: minterAddress.toLowerCase(),
      tokenId,
      quantity,
      totalPaid: totalPaid?.toString() || "0",
      mintMode: mintMode || "public",
      chainId: chainId || 11155111,
      collectionId,
      userId: user.id,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
