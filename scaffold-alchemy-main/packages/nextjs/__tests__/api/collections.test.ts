import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma — use vi.hoisted so mock fns are available before vi.mock is hoisted
const { mockFindMany, mockCount, mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("~~/lib/prisma", () => ({
  prisma: {
    collection: {
      findMany: mockFindMany,
      count: mockCount,
      create: mockCreate,
    },
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

import { GET, POST } from "~~/app/api/collections/route";

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/collections");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString()) as any;
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

describe("GET /api/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns collections with default pagination", async () => {
    mockFindMany.mockResolvedValueOnce([{ id: "1", name: "Test Collection" }]);
    mockCount.mockResolvedValueOnce(1);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.collections).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(12);
    expect(body.totalPages).toBe(1);
  });

  it("passes search parameter to query", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest({ search: "bored" }));

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
    expect(whereArg.OR).toHaveLength(3);
  });

  it("passes status filter", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest({ status: "live" }));

    expect(mockFindMany.mock.calls[0][0].where.status).toBe("live");
  });

  it("passes owner filter", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest({ owner: "0xABC" }));

    expect(mockFindMany.mock.calls[0][0].where.owner.address).toBe("0xabc");
  });

  it("handles custom pagination", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(50);

    const res = await GET(makeGetRequest({ page: "3", limit: "10" }));
    const body = await res.json();

    expect(body.page).toBe(3);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(5);
    expect(mockFindMany.mock.calls[0][0].skip).toBe(20);
    expect(mockFindMany.mock.calls[0][0].take).toBe(10);
  });

  it("sorts by name when sort=name", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest({ sort: "name" }));

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ name: "asc" });
  });

  it("sorts by newest by default", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest());

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });
});

describe("POST /api/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostRequest({ name: "Test" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("creates collection with valid data", async () => {
    const fakeUser = { id: "user-1", address: "0x1234" };
    const fakeCollection = { id: "col-1", name: "Test NFT" };

    mockFindUnique.mockResolvedValueOnce(fakeUser);
    mockCreate.mockResolvedValueOnce(fakeCollection);

    const res = await POST(
      makePostRequest({
        name: "Test NFT",
        symbol: "TNFT",
        maxSupply: 10000,
        mintPrice: "10000000000000000",
        ownerAddress: "0x1234",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("col-1");
  });

  it("creates user if not exists", async () => {
    const fakeUser = { id: "user-new", address: "0x1234" };
    const fakeCollection = { id: "col-1", name: "Test NFT" };

    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(fakeUser);
    mockCreate.mockResolvedValueOnce(fakeCollection);

    const res = await POST(
      makePostRequest({
        name: "Test NFT",
        symbol: "TNFT",
        maxSupply: 10000,
        mintPrice: "10000000000000000",
        ownerAddress: "0x1234",
      }),
    );

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledTimes(2); // user + collection
  });

  it("links contractAddress + chainId when created via the Factory wizard", async () => {
    const fakeUser = { id: "user-1", address: "0x1234" };
    mockFindUnique.mockResolvedValueOnce(fakeUser);
    mockCreate.mockResolvedValueOnce({ id: "col-1" });

    const res = await POST(
      makePostRequest({
        name: "Agent Club",
        symbol: "AGT",
        maxSupply: 1000,
        mintPrice: "10000000000000000",
        ownerAddress: "0x1234",
        contractAddress: "0xAbC1234567890123456789012345678901234567",
        chainId: 31337,
      }),
    );

    expect(res.status).toBe(201);
    const createData = mockCreate.mock.calls[0][0].data;
    expect(createData.contractAddress).toBe("0xabc1234567890123456789012345678901234567"); // lowercased
    expect(createData.chainId).toBe(31337);
  });

  it("rejects an invalid contract address", async () => {
    const res = await POST(
      makePostRequest({
        name: "T",
        symbol: "T",
        maxSupply: 1,
        mintPrice: "1",
        ownerAddress: "0x1234",
        contractAddress: "not-an-address",
      }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid contract address");
  });

  it("defaults chainId to 11155111 (Sepolia) when absent", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "user-1", address: "0x1234" });
    mockCreate.mockResolvedValueOnce({ id: "col-1" });

    await POST(
      makePostRequest({
        name: "T",
        symbol: "T",
        maxSupply: 1,
        mintPrice: "1",
        ownerAddress: "0x1234",
      }),
    );

    expect(mockCreate.mock.calls[0][0].data.chainId).toBe(11155111);
  });
});
