import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../../middleware";

function makeReq(url: string, opts: { method?: string; origin?: string; auth?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.origin) headers.origin = opts.origin;
  if (opts.auth) headers.authorization = opts.auth;
  return new NextRequest(url, { method: opts.method ?? "GET", headers });
}

function isNext(res: NextResponse): boolean {
  return res.status === 200 && res.headers.get("x-middleware-next") === "1";
}

describe("API auth middleware (Phase 1A)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLATFORM_API_KEY", "test-platform-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes read endpoints without auth", () => {
    const res = middleware(makeReq("http://localhost/api/collections/abc"));
    expect(isNext(res)).toBe(true);
  });

  it("rejects cross-origin writes without the key", () => {
    const res = middleware(
      makeReq("http://localhost/api/signature", { method: "POST", origin: "https://evil.example.com" }),
    );
    expect(res.status).toBe(401);
  });

  it("accepts cross-origin writes with the correct key", () => {
    const res = middleware(
      makeReq("http://localhost/api/signature", {
        method: "POST",
        origin: "https://evil.example.com",
        auth: "Bearer test-platform-key",
      }),
    );
    expect(isNext(res)).toBe(true);
  });

  it("rejects a wrong key", () => {
    const res = middleware(
      makeReq("http://localhost/api/collections", {
        method: "POST",
        origin: "https://evil.example.com",
        auth: "Bearer wrong",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("exempts same-origin browser writes (our own frontend)", () => {
    const res = middleware(
      makeReq("http://localhost/api/collections", { method: "POST", origin: "http://localhost" }),
    );
    expect(isNext(res)).toBe(true);
  });

  it("leaves writes open when PLATFORM_API_KEY is not configured (backward compatible)", () => {
    vi.stubEnv("PLATFORM_API_KEY", undefined);
    const res = middleware(
      makeReq("http://localhost/api/metadata/generate", { method: "POST", origin: "https://evil.example.com" }),
    );
    expect(isNext(res)).toBe(true);
  });

  it("skips the check outside production (local dev)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = middleware(
      makeReq("http://localhost/api/signature", { method: "POST", origin: "https://evil.example.com" }),
    );
    expect(isNext(res)).toBe(true);
  });
});
