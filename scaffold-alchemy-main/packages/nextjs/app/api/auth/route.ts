import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";

// POST /api/auth — 钱包签名认证（简化版：只验证地址格式，实际生产应验证签名）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address } = body;

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  // 简化版：只验证地址格式，创建/获取用户
  // 生产环境应验证 signature 确实来自该 address
  const normalizedAddress = address.toLowerCase();

  let user = await prisma.user.findUnique({ where: { address: normalizedAddress } });
  if (!user) {
    user = await prisma.user.create({ data: { address: normalizedAddress } });
  }

  return NextResponse.json({
    user: { id: user.id, address: user.address },
    token: `simple_${user.id}_${Date.now()}`, // 简化 token，生产环境用 JWT
  });
}
