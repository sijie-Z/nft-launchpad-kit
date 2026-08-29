import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";

// GET /api/agents — list agents with optional search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { address: { contains: search.toLowerCase() } },
    ];
  }

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agent.count({ where }),
  ]);

  return NextResponse.json({ agents, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// POST /api/agents — register an agent identity
// Body: { address, name, description?, capabilities? }
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`agent:${ip}`, RATE_LIMITS.normal);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { address, name, description, capabilities } = body;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid agent address required" }, { status: 400 });
  }
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (capabilities !== undefined && !Array.isArray(capabilities)) {
    return NextResponse.json({ error: "capabilities must be an array" }, { status: 400 });
  }

  const agent = await prisma.agent.upsert({
    where: { address: address.toLowerCase() },
    update: {
      name: String(name).trim(),
      description: description ? String(description) : undefined,
      capabilities: capabilities ? JSON.stringify(capabilities) : undefined,
    },
    create: {
      address: address.toLowerCase(),
      name: String(name).trim(),
      description: description ? String(description) : null,
      capabilities: capabilities ? JSON.stringify(capabilities) : null,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
