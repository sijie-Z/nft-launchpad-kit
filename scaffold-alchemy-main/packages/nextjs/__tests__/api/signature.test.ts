import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("~~/lib/prisma", () => ({ prisma: {} }));
vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
  })),
}));
vi.mock("~~/utils/signature", () => ({
  generateUID: vi.fn(() => "test-uid-123"),
  signMintAuth712V2: vi.fn(async () => "0xsignature"),
}));

import { POST } from "~~/app/api/signature/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

const validBody = {
  minter: "0xabcdef1234567890abcdef1234567890abcdef12",
  quantity: 2,
  maxMint: 5,
  deadline: Math.floor(Date.now() / 1000) + 3600,
  pricePerToken: 0,
  contractAddress: "0x7597D0D4e46Ad4E35bFfe8a52616d809765F4B22",
  chainId: 11155111,
};

describe("POST /api/signature", () => {
  beforeEach(() => {
    // Reset rate limiter state by using unique IPs
    vi.restoreAllMocks();
    process.env.SIGNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ minter: "0xabc" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 for invalid minter address", async () => {
    const res = await POST(makeRequest({ ...validBody, minter: "not-an-address" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid minter address");
  });

  it("returns 400 for invalid contract address", async () => {
    const res = await POST(makeRequest({ ...validBody, contractAddress: "bad" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid contract address");
  });

  it("returns 400 for past deadline", async () => {
    const res = await POST(makeRequest({ ...validBody, deadline: 1000 }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Deadline must be in the future");
  });

  it("returns 500 when SIGNER_PRIVATE_KEY is missing", async () => {
    delete process.env.SIGNER_PRIVATE_KEY;
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toContain("SIGNER_PRIVATE_KEY missing");
  });

  it("returns 200 with signature on valid request", async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.signature).toBe("0xsignature");
    expect(body.uid).toBe("test-uid-123");
    expect(body.deadline).toBe(validBody.deadline);
    expect(body.signer).toBeDefined();
  });
});
