import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "~~/app/api/whitelist/route";

const { mockFindMany, mockUpsert, mockDeleteMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUpsert: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

vi.mock("~~/lib/prisma", () => ({
  prisma: {
    whitelistEntry: {
      findMany: mockFindMany,
      upsert: mockUpsert,
      deleteMany: mockDeleteMany,
    },
  },
}));

function makeGetRequest(collectionId?: string) {
  const url = new URL("http://localhost/api/whitelist");
  if (collectionId) url.searchParams.set("collectionId", collectionId);
  return new Request(url.toString()) as any;
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/whitelist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

function makeDeleteRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/whitelist", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

describe("GET /api/whitelist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when collectionId is missing", async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("collectionId required");
  });

  it("returns whitelist entries for a collection", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "1", address: "0x1234", maxMint: 3 },
      { id: "2", address: "0x5678", maxMint: 1 },
    ]);

    const res = await GET(makeGetRequest("col-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("returns empty list for collection with no whitelist", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await GET(makeGetRequest("col-empty"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});

describe("POST /api/whitelist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 when entries is not an array", async () => {
    const res = await POST(makePostRequest({ collectionId: "col-1", entries: "not-array" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("batch upserts whitelist entries", async () => {
    mockUpsert.mockResolvedValue({ id: "1" });

    const res = await POST(
      makePostRequest({
        collectionId: "col-1",
        entries: [
          { address: "0x1234", maxMint: 3 },
          { address: "0x5678", maxMint: 1 },
        ],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it("normalizes addresses to lowercase", async () => {
    mockUpsert.mockResolvedValue({ id: "1" });

    await POST(
      makePostRequest({
        collectionId: "col-1",
        entries: [{ address: "0xABC", maxMint: 1 }],
      }),
    );

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.where.collectionId_address.address).toBe("0xabc");
    expect(upsertCall.create.address).toBe("0xabc");
  });

  it("defaults maxMint to 1", async () => {
    mockUpsert.mockResolvedValue({ id: "1" });

    await POST(
      makePostRequest({
        collectionId: "col-1",
        entries: [{ address: "0x1234" }],
      }),
    );

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.maxMint).toBe(1);
  });
});

describe("DELETE /api/whitelist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await DELETE(makeDeleteRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 when addresses is not an array", async () => {
    const res = await DELETE(makeDeleteRequest({ collectionId: "col-1", addresses: "not-array" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("deletes whitelist entries by addresses", async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 2 });

    const res = await DELETE(
      makeDeleteRequest({
        collectionId: "col-1",
        addresses: ["0x1234", "0x5678"],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        collectionId: "col-1",
        address: { in: ["0x1234", "0x5678"] },
      },
    });
  });

  it("normalizes addresses to lowercase in delete", async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });

    await DELETE(
      makeDeleteRequest({
        collectionId: "col-1",
        addresses: ["0xABC"],
      }),
    );

    const deleteCall = mockDeleteMany.mock.calls[0][0];
    expect(deleteCall.where.address.in).toEqual(["0xabc"]);
  });
});
