import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";

// GET /api/analytics?collectionId=xxx — 集合分析数据
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");

  if (!collectionId) {
    // 平台级统计
    const [totalCollections, totalMints, totalUsers, recentMints] = await Promise.all([
      prisma.collection.count(),
      prisma.mintRecord.count(),
      prisma.user.count(),
      prisma.mintRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { collection: { select: { name: true } } },
      }),
    ]);

    return NextResponse.json({
      totalCollections,
      totalMints,
      totalUsers,
      recentMints,
    });
  }

  // 集合级统计
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { _count: { select: { mintRecords: true, whitelistEntries: true } } },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const [totalMinted, uniqueMinters, recentMints, mintByMode] = await Promise.all([
    prisma.mintRecord.aggregate({
      where: { collectionId },
      _sum: { quantity: true },
    }),
    prisma.mintRecord.findMany({
      where: { collectionId },
      select: { minterAddress: true },
      distinct: ["minterAddress"],
    }),
    prisma.mintRecord.findMany({
      where: { collectionId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.mintRecord.groupBy({
      by: ["mintMode"],
      where: { collectionId },
      _count: true,
      _sum: { quantity: true },
    }),
  ]);

  return NextResponse.json({
    collection: { name: collection.name, maxSupply: collection.maxSupply, status: collection.status },
    totalMinted: totalMinted._sum.quantity || 0,
    uniqueMinters: uniqueMinters.length,
    whitelistCount: collection._count.whitelistEntries,
    recentMints,
    mintByMode,
  });
}
