import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "~~/lib/rateLimit";

// POST /api/agents/[address]/grants — record an issuance grant (audit trail)
// Called by the signing service when an agent issues a mint authorization
// via /api/signature (the on-chain half is verifiable via the UID).
export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } },
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`grant:${ip}`, RATE_LIMITS.normal);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const address = params.address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { address } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found — register it first" }, { status: 404 });
  }

  const body = await req.json();
  const { minter, quantity, pricePerToken, deadline, uid, collectionAddress } = body;
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "uid required" }, { status: 400 });
  }

  const grant = await prisma.agentGrant.create({
    data: {
      agentId: agent.id,
      minter: minter ? minter.toLowerCase() : null,
      quantity: quantity ? Number(quantity) : null,
      pricePerToken: pricePerToken ? String(pricePerToken) : null,
      deadline: deadline ? Number(deadline) : null,
      uid,
      collectionAddress: collectionAddress ? collectionAddress.toLowerCase() : null,
    },
  });

  return NextResponse.json(grant, { status: 201 });
}
