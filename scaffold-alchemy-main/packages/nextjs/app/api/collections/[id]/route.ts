import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";

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

// PUT /api/collections/:id — update collection (owner only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`col-put:${ip}`, RATE_LIMITS.normal);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { ownerAddress, status, contractAddress, baseURI, preRevealURI, revealSeed, platformFeeBps, royaltyBps } = body;

  if (!ownerAddress) {
    return NextResponse.json({ error: "ownerAddress required for authorization" }, { status: 401 });
  }

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { owner: { select: { address: true } } },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.owner.address.toLowerCase() !== ownerAddress.toLowerCase()) {
    return NextResponse.json({ error: "Not authorized: you are not the collection owner" }, { status: 403 });
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

// DELETE /api/collections/:id (owner only, draft only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`col-del:${ip}`, RATE_LIMITS.strict);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { ownerAddress } = body;

  if (!ownerAddress) {
    return NextResponse.json({ error: "ownerAddress required for authorization" }, { status: 401 });
  }

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { owner: { select: { address: true } } },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.owner.address.toLowerCase() !== ownerAddress.toLowerCase()) {
    return NextResponse.json({ error: "Not authorized: you are not the collection owner" }, { status: 403 });
  }

  if (collection.status === "deployed" || collection.status === "active") {
    return NextResponse.json({ error: "Cannot delete deployed collection" }, { status: 400 });
  }

  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
