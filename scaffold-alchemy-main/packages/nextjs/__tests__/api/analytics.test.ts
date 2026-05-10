import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "~~/app/api/analytics/route";

const { mockCount, mockFindMany, mockFindUnique, mockAggregate, mockGroupBy } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockAggregate: vi.fn(),
  mockGroupBy: vi.fn(),
}));

vi.mock("~~/lib/prisma", () => ({
  prisma: {
    collection: {
      count: mockCount,
      findUnique: mockFindUnique,
    },
    mintRecord: {
      count: mockCount,
      findMany: mockFindMany,
      aggregate: mockAggregate,
      groupBy: mockGroupBy,
    },
    user: {
      count: mockCount,
    },
  },
}));

function makeRequest(collectionId?: string) {
  const url = new URL("http://localhost/api/analytics");
  if (collectionId) url.searchParams.set("collectionId", collectionId);
  return new Request(url.toString()) as any;
}

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns platform-level stats when no collectionId", async () => {
    mockCount.mockResolvedValueOnce(5); // collections
    mockCount.mockResolvedValueOnce(100); // mints
    mockCount.mockResolvedValueOnce(30); // users
    mockFindMany.mockResolvedValueOnce([{ id: "1", txHash: "0xabc" }]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalCollections).toBe(5);
    expect(body.totalMints).toBe(100);
    expect(body.totalUsers).toBe(30);
    expect(body.recentMints).toHaveLength(1);
  });

  it("returns 404 for non-existent collection", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("non-existent-id"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("Collection not found");
  });

  it("returns collection-level stats", async () => {
    mockFindUnique.mockResolvedValueOnce({
      name: "Test NFT",
      maxSupply: 10000,
      status: "live",
      _count: { mintRecords: 50, whitelistEntries: 20 },
    });
    mockAggregate.mockResolvedValueOnce({ _sum: { quantity: 50 } });
    mockFindMany.mockResolvedValueOnce([{ minterAddress: "0x1" }, { minterAddress: "0x2" }]);
    mockFindMany.mockResolvedValueOnce([{ id: "1", txHash: "0xabc" }]);
    mockGroupBy.mockResolvedValueOnce([{ mintMode: "public", _count: 30, _sum: { quantity: 30 } }]);

    const res = await GET(makeRequest("col-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.collection.name).toBe("Test NFT");
    expect(body.totalMinted).toBe(50);
    expect(body.uniqueMinters).toBe(2);
    expect(body.whitelistCount).toBe(20);
    expect(body.mintByMode).toHaveLength(1);
  });
});
