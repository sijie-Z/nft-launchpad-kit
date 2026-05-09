import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";

// GET /api/collections — 列表
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const owner = searchParams.get("owner");

  const where: any = {};
  if (status) where.status = status;
  if (owner) where.owner = { address: owner.toLowerCase() };

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      include: { owner: { select: { address: true } }, _count: { select: { mintRecords: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.collection.count({ where }),
  ]);

  return NextResponse.json({ collections, total, page, limit });
}

// POST /api/collections — 创建集合
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, symbol, description, maxSupply, mintPrice, maxPerWallet, ownerAddress, coverImage } = body;

  if (!name || !symbol || !maxSupply || !mintPrice || !ownerAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 自动创建用户
  let user = await prisma.user.findUnique({ where: { address: ownerAddress.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({ data: { address: ownerAddress.toLowerCase() } });
  }

  const collection = await prisma.collection.create({
    data: {
      name,
      symbol,
      description,
      maxSupply,
      mintPrice: mintPrice.toString(),
      maxPerWallet: maxPerWallet || 5,
      coverImage,
      ownerId: user.id,
    },
  });

  return NextResponse.json(collection, { status: 201 });
}
