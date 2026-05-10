import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "~~/app/api/mint-records/route";

const { mockFindMany, mockCount, mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("~~/lib/prisma", () => ({
  prisma: {
    mintRecord: {
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

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/mint-records");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString()) as any;
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/mint-records", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

describe("GET /api/mint-records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns records with default pagination", async () => {
    mockFindMany.mockResolvedValueOnce([{ id: "1", txHash: "0xabc" }]);
    mockCount.mockResolvedValueOnce(1);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.records).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
  });

  it("filters by collectionId", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest({ collectionId: "col-1" }));

    expect(mockFindMany.mock.calls[0][0].where.collectionId).toBe("col-1");
  });

  it("filters by minter address", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeGetRequest({ minter: "0xABC" }));

    expect(mockFindMany.mock.calls[0][0].where.minterAddress).toBe("0xabc");
  });

  it("handles custom pagination", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(100);

    const res = await GET(makeGetRequest({ page: "2", limit: "10" }));
    const body = await res.json();

    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(mockFindMany.mock.calls[0][0].skip).toBe(10);
    expect(mockFindMany.mock.calls[0][0].take).toBe(10);
  });
});

describe("POST /api/mint-records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostRequest({ txHash: "0xabc" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("creates mint record with valid data", async () => {
    const fakeUser = { id: "user-1", address: "0x1234" };
    const fakeRecord = { id: "rec-1", txHash: "0xabc", quantity: 2 };

    mockFindUnique.mockResolvedValueOnce(fakeUser);
    mockCreate.mockResolvedValueOnce(fakeRecord);

    const res = await POST(
      makePostRequest({
        txHash: "0xabc",
        minterAddress: "0x1234",
        quantity: 2,
        collectionId: "col-1",
        totalPaid: "20000000000000000",
        mintMode: "public",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("rec-1");
  });

  it("creates user if not exists", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({ id: "user-new", address: "0x1234" });
    mockCreate.mockResolvedValueOnce({ id: "rec-1" });

    const res = await POST(
      makePostRequest({
        txHash: "0xabc",
        minterAddress: "0x1234",
        quantity: 1,
        collectionId: "col-1",
      }),
    );

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("normalizes minter address to lowercase", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u1", address: "0xabc" });
    mockCreate.mockResolvedValueOnce({ id: "rec-1" });

    await POST(
      makePostRequest({
        txHash: "0xabc",
        minterAddress: "0xABC",
        quantity: 1,
        collectionId: "col-1",
      }),
    );

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.minterAddress).toBe("0xabc");
  });

  it("defaults mintMode to public", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u1", address: "0x1234" });
    mockCreate.mockResolvedValueOnce({ id: "rec-1" });

    await POST(
      makePostRequest({
        txHash: "0xabc",
        minterAddress: "0x1234",
        quantity: 1,
        collectionId: "col-1",
      }),
    );

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.mintMode).toBe("public");
  });
});
