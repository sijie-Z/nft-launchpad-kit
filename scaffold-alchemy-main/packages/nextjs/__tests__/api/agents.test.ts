import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockFindMany, mockCount, mockUpsert, mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpsert: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("~~/lib/prisma", () => ({
  prisma: {
    agent: {
      findMany: mockFindMany,
      count: mockCount,
      upsert: mockUpsert,
      findUnique: mockFindUnique,
    },
    agentGrant: {
      create: mockCreate,
    },
  },
}));

import { GET, POST } from "~~/app/api/agents/route";
import { GET as GET_AGENT } from "~~/app/api/agents/[address]/route";
import { POST as POST_GRANT } from "~~/app/api/agents/[address]/grants/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

const AGENT_ADDR = "0xAbC1234567890123456789012345678901234567";

describe("GET /api/agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists agents with pagination", async () => {
    mockFindMany.mockResolvedValueOnce([{ id: "a1", name: "MintBot" }]);
    mockCount.mockResolvedValueOnce(1);

    const res = await GET(new Request("http://localhost/api/agents") as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.agents).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("passes search to the query", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(new Request("http://localhost/api/agents?search=MintBot") as any);

    expect(mockFindMany.mock.calls[0][0].where.OR).toHaveLength(2);
  });
});

describe("POST /api/agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid address", async () => {
    const res = await POST(makeRequest({ address: "nope", name: "Bot" }));
    expect(res.status).toBe(400);
  });

  it("registers an agent (upsert) with normalized address", async () => {
    mockUpsert.mockResolvedValueOnce({ id: "a1", address: AGENT_ADDR.toLowerCase(), name: "MintBot" });

    const res = await POST(
      makeRequest({
        address: AGENT_ADDR,
        name: "MintBot",
        description: "issues membership cards",
        capabilities: ["mint", "membership"],
      }),
    );

    expect(res.status).toBe(201);
    const [args] = mockUpsert.mock.calls[0];
    expect(args.where.address).toBe(AGENT_ADDR.toLowerCase());
    expect(args.create.capabilities).toBe(JSON.stringify(["mint", "membership"]));
    expect(args.update.capabilities).toBe(JSON.stringify(["mint", "membership"]));
  });
});

describe("GET /api/agents/[address]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for unknown agent", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await GET_AGENT(new Request("http://localhost/api/agents/x") as any, {
      params: { address: AGENT_ADDR },
    } as any);
    expect(res.status).toBe(404);
  });

  it("includes grant history", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "a1", grants: [{ uid: "u1" }] });
    const res = await GET_AGENT(new Request("http://localhost/api/agents/x") as any, {
      params: { address: AGENT_ADDR },
    } as any);
    const body = await res.json();
    expect(body.grants).toHaveLength(1);
  });
});

describe("POST /api/agents/[address]/grants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a registered agent", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await POST_GRANT(
      makeRequest({ uid: "u1" }),
      { params: { address: AGENT_ADDR } } as any,
    );
    expect(res.status).toBe(404);
  });

  it("records a grant with the agent id", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "agent-1", address: AGENT_ADDR.toLowerCase() });
    mockCreate.mockResolvedValueOnce({ id: "g1", uid: "u1" });

    const res = await POST_GRANT(
      makeRequest({
        minter: AGENT_ADDR,
        quantity: 2,
        pricePerToken: "10000000000000000",
        deadline: 9999999999,
        uid: "u1",
        collectionAddress: AGENT_ADDR,
      }),
      { params: { address: AGENT_ADDR } } as any,
    );

    expect(res.status).toBe(201);
    const [data] = mockCreate.mock.calls[0];
    expect(data.data.agentId).toBe("agent-1");
    expect(data.data.minter).toBe(AGENT_ADDR.toLowerCase());
    expect(data.data.quantity).toBe(2);
    expect(data.data.uid).toBe("u1");
  });

  it("rejects a grant without uid", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "agent-1" });
    const res = await POST_GRANT(makeRequest({ quantity: 1 }), {
      params: { address: AGENT_ADDR },
    } as any);
    expect(res.status).toBe(400);
  });
});
