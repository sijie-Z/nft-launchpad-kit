import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";

// GET /api/agents/[address] — agent detail incl. grant history
export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } },
) {
  const address = params.address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { address },
    include: {
      grants: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}
