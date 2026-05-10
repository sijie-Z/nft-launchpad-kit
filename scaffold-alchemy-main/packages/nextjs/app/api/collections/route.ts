import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";

// GET /api/collections — list with search, sort, filter, pagination
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const status = searchParams.get("status");
  const owner = searchParams.get("owner");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "newest";

  const where: any = {};
  if (status) where.status = status;
  if (owner) where.owner = { address: owner.toLowerCase() };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { symbol: { contains: search } },
      { description: { contains: search } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  switch (sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "name":
      orderBy = { name: "asc" };
      break;
    case "supply":
      orderBy = { maxSupply: "desc" };
      break;
    case "price_asc":
      orderBy = { mintPrice: "asc" };
      break;
    case "price_desc":
      orderBy = { mintPrice: "desc" };
      break;
    case "mints":
      orderBy = { mintRecords: { _count: "desc" } };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      include: { owner: { select: { address: true } }, _count: { select: { mintRecords: true } } },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.collection.count({ where }),
  ]);

  return NextResponse.json({ collections, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// POST /api/collections — create
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`col:${ip}`, RATE_LIMITS.normal);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { name, symbol, description, maxSupply, mintPrice, maxPerWallet, ownerAddress, coverImage } = body;

  if (!name || !symbol || !maxSupply || !mintPrice || !ownerAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
