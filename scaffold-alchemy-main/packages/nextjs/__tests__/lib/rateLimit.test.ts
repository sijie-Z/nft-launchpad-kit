import { afterEach, beforeEach, describe, expect, it } from "vitest";

// We need to import the actual functions, but the module has a setInterval
// that runs on import. That's fine for tests.
import { checkRateLimit, getClientIp, RATE_LIMITS } from "~~/lib/rateLimit";

// Clear the store between tests by re-importing
beforeEach(() => {
  // The store is internal, but we can test behavior by using unique keys
});

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test-allow-first", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
  });

  it("allows requests within limit", () => {
    const key = `test-within-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 });
      expect(result.success).toBe(true);
    }
  });

  it("blocks requests over limit", () => {
    const key = `test-over-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    }
    const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("uses default config when none provided", () => {
    const key = `test-default-${Date.now()}`;
    const result = checkRateLimit(key);
    expect(result.success).toBe(true);
  });

  it("different keys have independent limits", () => {
    const keyA = `test-independent-a-${Date.now()}`;
    const keyB = `test-independent-b-${Date.now()}`;
    // Exhaust key A
    for (let i = 0; i < 30; i++) {
      checkRateLimit(keyA, { limit: 30, windowMs: 60_000 });
    }
    // key A should be blocked
    expect(checkRateLimit(keyA, { limit: 30, windowMs: 60_000 }).success).toBe(false);
    // key B should still be allowed
    expect(checkRateLimit(keyB, { limit: 30, windowMs: 60_000 }).success).toBe(true);
  });

  it("resets after window expires", async () => {
    const key = `test-expire-${Date.now()}`;
    // Use a very short window
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { limit: 3, windowMs: 50 });
    }
    expect(checkRateLimit(key, { limit: 3, windowMs: 50 }).success).toBe(false);
    // Wait for window to expire
    await new Promise(r => setTimeout(r, 60));
    expect(checkRateLimit(key, { limit: 3, windowMs: 50 }).success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("falls back to 127.0.0.1 when no headers", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
      },
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });
});

describe("RATE_LIMITS", () => {
  it("has strict preset at 10/min", () => {
    expect(RATE_LIMITS.strict).toEqual({ limit: 10, windowMs: 60_000 });
  });

  it("has normal preset at 30/min", () => {
    expect(RATE_LIMITS.normal).toEqual({ limit: 30, windowMs: 60_000 });
  });

  it("has relaxed preset at 60/min", () => {
    expect(RATE_LIMITS.relaxed).toEqual({ limit: 60, windowMs: 60_000 });
  });
});
