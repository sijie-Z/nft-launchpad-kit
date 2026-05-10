import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "~~/app/api/auth/route";

const { mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("~~/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when address is missing", async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Address required");
  });

  it("returns existing user and token", async () => {
    const existingUser = { id: "user-1", address: "0x1234" };
    mockFindUnique.mockResolvedValueOnce(existingUser);

    const res = await POST(makeRequest({ address: "0x1234" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.id).toBe("user-1");
    expect(body.user.address).toBe("0x1234");
    expect(body.token).toContain("simple_user-1");
  });

  it("creates new user if not exists", async () => {
    const newUser = { id: "user-new", address: "0x1234" };
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(newUser);

    const res = await POST(makeRequest({ address: "0x1234" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.id).toBe("user-new");
    expect(mockCreate).toHaveBeenCalledWith({ data: { address: "0x1234" } });
  });

  it("normalizes address to lowercase", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "u1", address: "0xabc" });

    await POST(makeRequest({ address: "0xABC" }));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { address: "0xabc" } });
  });
});
