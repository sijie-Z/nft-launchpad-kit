import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";

// GET /api/collections/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { address: true } },
      mintRecords: { orderBy: { createdAt: "desc" }, take: 50 },
      claimPhases: { orderBy: { phaseId: "asc" } },
      whitelistEntries: true,
      _count: { select: { mintRecords: true, whitelistEntries: true } },
    },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json(collection);
}

// PUT /api/collections/:id — 更新集合
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { status, contractAddress, baseURI, preRevealURI, revealSeed, platformFeeBps, royaltyBps } = body;

  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const updated = await prisma.collection.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(contractAddress && { contractAddress }),
      ...(baseURI && { baseURI }),
      ...(preRevealURI !== undefined && { preRevealURI }),
      ...(revealSeed !== undefined && { revealSeed }),
      ...(platformFeeBps !== undefined && { platformFeeBps }),
      ...(royaltyBps !== undefined && { royaltyBps }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/collections/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.status === "deployed" || collection.status === "active") {
    return NextResponse.json({ error: "Cannot delete deployed collection" }, { status: 400 });
  }

  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
