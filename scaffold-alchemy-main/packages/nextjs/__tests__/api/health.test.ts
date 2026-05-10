import { describe, expect, it, vi } from "vitest";

// Mock prisma before importing the route
vi.mock("~~/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "~~/lib/prisma";
import { GET } from "~~/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with ok status when database is reachable", async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([1]);
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
  });

  it("returns 503 with degraded status when database fails", async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Connection refused"));
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.database.status).toBe("error");
  });
});
