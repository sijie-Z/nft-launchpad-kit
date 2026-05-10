import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getEnvSummary, validateEnv } from "~~/lib/env";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("validateEnv", () => {
  it("returns valid when all required vars are set", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.ALCHEMY_API_KEY = "test-key";
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("returns invalid when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    process.env.ALCHEMY_API_KEY = "test-key";
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toContain("DATABASE_URL");
  });

  it("returns invalid when ALCHEMY_API_KEY is missing", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    delete process.env.ALCHEMY_API_KEY;
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toContain("ALCHEMY_API_KEY");
  });

  it("reports warnings for optional vars", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.ALCHEMY_API_KEY = "test-key";
    delete process.env.SIGNER_PRIVATE_KEY;
    delete process.env.ETHERSCAN_API_KEY;
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.some(w => w.includes("SIGNER_PRIVATE_KEY"))).toBe(true);
    expect(result.warnings.some(w => w.includes("ETHERSCAN_API_KEY"))).toBe(true);
  });

  it("treats empty string as missing", () => {
    process.env.DATABASE_URL = "  ";
    process.env.ALCHEMY_API_KEY = "test-key";
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(1);
  });

  it("no warnings when all optional vars are set", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.ALCHEMY_API_KEY = "test-key";
    process.env.SIGNER_PRIVATE_KEY = "0xabc";
    process.env.ETHERSCAN_API_KEY = "xyz";
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("getEnvSummary", () => {
  it("includes all env var names", () => {
    const summary = getEnvSummary();
    expect(summary).toContain("DATABASE_URL");
    expect(summary).toContain("ALCHEMY_API_KEY");
    expect(summary).toContain("SIGNER_PRIVATE_KEY");
    expect(summary).toContain("ETHERSCAN_API_KEY");
  });

  it("shows OK for set vars", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    const summary = getEnvSummary();
    expect(summary).toContain("DATABASE_URL: OK");
  });

  it("shows MISSING for required unset vars", () => {
    delete process.env.DATABASE_URL;
    const summary = getEnvSummary();
    expect(summary).toContain("DATABASE_URL: MISSING");
  });

  it("shows 'not set' for optional unset vars", () => {
    delete process.env.SIGNER_PRIVATE_KEY;
    const summary = getEnvSummary();
    expect(summary).toContain("SIGNER_PRIVATE_KEY: not set");
  });
});
