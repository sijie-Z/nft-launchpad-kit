import { NextResponse } from "next/server";
import { prisma } from "~~/lib/prisma";

/**
 * GET /api/health — Health check endpoint
 *
 * Returns service status. Used by load balancers, monitoring, and uptime checks.
 * Checks database connectivity.
 */
export async function GET() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "ok", latencyMs: dbLatency },
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: "error", latencyMs: Date.now() - start },
        },
      },
      { status: 503 },
    );
  }
}
