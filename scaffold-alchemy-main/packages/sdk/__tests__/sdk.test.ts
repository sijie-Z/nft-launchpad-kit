import { describe, expect, it, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { LaunchpadKit } from "../src/index";
import { ApiError } from "../src/client";

const AGENT_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const USER_ADDR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

function makeKit(overrides: Partial<Parameters<typeof LaunchpadKit.prototype.constructor>[0]> = {}) {
  return new LaunchpadKit({
    baseUrl: "http://localhost:56900",
    chain: "localhost",
    wallet: privateKeyToAccount(AGENT_KEY),
    ...overrides,
  });
}

function mockFetchOnce(json: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(json) });
}

describe("LaunchpadKit — API layer", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("sends the api key as a Bearer header on writes", async () => {
    const fetchMock = mockFetchOnce({ id: "a1" });
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit({ apiKey: "secret-key" });

    await kit.agents.register({ address: USER_ADDR, name: "Bot" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:56900/api/agents");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
  });

  it("omits the auth header when no api key is configured", async () => {
    const fetchMock = mockFetchOnce([]);
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    await kit.collections.list();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("agents.register posts the identity and normalizes the body", async () => {
    const fetchMock = mockFetchOnce({ id: "a1", address: USER_ADDR.toLowerCase() });
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    await kit.agents.register({ address: USER_ADDR, name: "QuestBot", capabilities: ["mint"] });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("QuestBot");
    expect(body.capabilities).toEqual(["mint"]);
  });

  it("collections.register posts the collection to /api/collections", async () => {
    const fetchMock = mockFetchOnce({ id: "c1", contractAddress: USER_ADDR.toLowerCase() });
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    await kit.collections.register({
      name: "Agent Club",
      symbol: "AGT",
      supply: 1000,
      price: "0.01",
      contractAddress: USER_ADDR,
      ownerAddress: USER_ADDR,
      chainId: 31337,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:56900/api/collections");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Agent Club");
    expect(body.contractAddress).toBe(USER_ADDR);
    expect(body.chainId).toBe(31337);
  });

  it("grants.issue posts to /api/signature with the collection address and chain", async () => {
    const fetchMock = mockFetchOnce({
      signature: "0xabc",
      uid: "0xuid",
      deadline: 123,
      signer: "0xsigner",
    });
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    const grant = await kit.grants.issue({
      collectionAddress: USER_ADDR,
      minter: USER_ADDR,
      quantity: 1,
      agentAddress: USER_ADDR,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.contractAddress).toBe(USER_ADDR);
    expect(body.chainId).toBe(31337);
    expect(body.agentAddress).toBe(USER_ADDR);
    expect(body.maxMint).toBe(5); // default
    // response merged with the request so mint() has everything it needs
    expect(grant.quantity).toBe(1);
    expect(grant.maxMint).toBe(5);
    expect(grant.pricePerToken).toBe(0);
  });

  it("grants.getSigner fetches the platform signer", async () => {
    const fetchMock = mockFetchOnce({ signer: "0xsigner", configured: true });
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    expect(await kit.grants.getSigner()).toBe("0xsigner");
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:56900/api/signature/config");
  });

  it("metadata.generate posts to /api/metadata/generate", async () => {
    const fetchMock = mockFetchOnce({ baseUri: "ipfs://QmMock/", count: 10, mock: true });
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    const res = await kit.metadata.generate({ name: "Agent Club", imageUrl: "https://x/{id}.png", count: 10 });
    expect(res.baseUri).toBe("ipfs://QmMock/");
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:56900/api/metadata/generate");
  });

  it("surfaces server errors as ApiError with status", async () => {
    const fetchMock = mockFetchOnce({ error: "Missing required fields" }, false, 400);
    vi.stubGlobal("fetch", fetchMock);
    const kit = makeKit();

    await expect(
      kit.agents.register({ address: USER_ADDR, name: "" }),
    ).rejects.toMatchObject({ status: 400, message: "Missing required fields" });
    expect(ApiError.prototype instanceof Error).toBe(true);
  });
});
