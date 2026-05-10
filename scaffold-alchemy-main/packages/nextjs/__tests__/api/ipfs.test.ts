import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "~~/app/api/ipfs/route";

vi.mock("~~/lib/prisma", () => ({ prisma: {} }));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ipfs", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/ipfs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET_KEY;
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ description: "test" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Name required");
  });

  it("returns mock hash when Pinata is not configured", async () => {
    const res = await POST(makeRequest({ name: "Test NFT", description: "A test" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ipfsHash).toMatch(/^QmMock/);
    expect(body.ipfsUrl).toMatch(/^ipfs:\/\//);
    expect(body.gatewayUrl).toContain("pinata.cloud");
    expect(body.mock).toBe(true);
  });

  it("includes attributes in mock response", async () => {
    const res = await POST(
      makeRequest({
        name: "NFT #1",
        description: "Rare",
        image: "ipfs://Qm123",
        attributes: [{ trait_type: "Background", value: "Blue" }],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ipfsHash).toBeDefined();
    expect(body.mock).toBe(true);
  });

  it("uploads to Pinata when configured", async () => {
    process.env.PINATA_API_KEY = "test-key";
    process.env.PINATA_SECRET_KEY = "test-secret";

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ IpfsHash: "QmRealHash123" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await POST(makeRequest({ name: "Test NFT" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ipfsHash).toBe("QmRealHash123");
    expect(body.ipfsUrl).toBe("ipfs://QmRealHash123");
    expect(body.mock).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      expect.objectContaining({ method: "POST" }),
    );

    vi.unstubAllGlobals();
  });

  it("returns 500 when Pinata returns error", async () => {
    process.env.PINATA_API_KEY = "test-key";
    process.env.PINATA_SECRET_KEY = "test-secret";

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await POST(makeRequest({ name: "Test NFT" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Pinata error");

    vi.unstubAllGlobals();
  });
});
