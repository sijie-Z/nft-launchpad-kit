import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "~~/app/api/metadata/generate/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/metadata/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/metadata/generate", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects missing fields", async () => {
    const res = await POST(makeRequest({ name: "A" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("imageUrl");
  });

  it("rejects an invalid imageUrl scheme", async () => {
    const res = await POST(makeRequest({ name: "A", imageUrl: "ftp://x", count: 1 }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid count", async () => {
    const res = await POST(makeRequest({ name: "A", imageUrl: "https://x.png", count: 0 }));
    expect(res.status).toBe(400);
    const res2 = await POST(makeRequest({ name: "A", imageUrl: "https://x.png", count: 10001 }));
    expect(res2.status).toBe(400);
  });

  it("dryRun returns a preview without uploading", async () => {
    const res = await POST(
      makeRequest({ name: "Agent Club", imageUrl: "https://cdn.example.com/{id}.png", count: 2, dryRun: true }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.count).toBe(2);
    expect(body.preview).toHaveLength(2);
    expect(body.preview[0].name).toBe("Agent Club #0");
    expect(body.baseUri).toBeUndefined();
  });

  it("returns a mock baseUri when PINATA_JWT is not configured", async () => {
    delete process.env.PINATA_JWT;
    const res = await POST(
      makeRequest({ name: "Agent Club", imageUrl: "https://cdn.example.com/{id}.png", count: 5 }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mock).toBe(true);
    expect(body.baseUri).toMatch(/^ipfs:\/\/QmMock/);
    expect(body.count).toBe(5);
  });

  it("uploads the folder and returns the real baseUri when PINATA_JWT is set", async () => {
    process.env.PINATA_JWT = "test-jwt";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { cid: "QmRealFolder" } }),
      }),
    );

    const res = await POST(
      makeRequest({ name: "Agent Club", imageUrl: "https://cdn.example.com/{id}.png", count: 3 }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.baseUri).toBe("ipfs://QmRealFolder/");
    expect(body.mock).toBeUndefined();

    // One upload call for the whole folder (the "5 minutes for 1000 tokens" promise).
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    delete process.env.PINATA_JWT;
  });

  it("surfaces Pinata errors", async () => {
    process.env.PINATA_JWT = "test-jwt";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("boom") }));

    const res = await POST(
      makeRequest({ name: "A", imageUrl: "https://x.png", count: 1 }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Pinata v3 error");
    delete process.env.PINATA_JWT;
  });
});
