import { describe, expect, it, vi } from "vitest";
import { generateMetadata, buildMetadataFormData, pinMetadataFolder } from "~~/utils/metadata";

describe("generateMetadata", () => {
  it("generates one token per count with sequential names", () => {
    const tokens = generateMetadata({ name: "Agent Club", imageUrl: "https://cdn.example.com/a/{id}.png", count: 3 });
    expect(tokens).toHaveLength(3);
    expect(tokens[0].name).toBe("Agent Club #0");
    expect(tokens[1].name).toBe("Agent Club #1");
    expect(tokens[2].name).toBe("Agent Club #2");
  });

  it("replaces the {id} placeholder in the image URL", () => {
    const tokens = generateMetadata({ name: "A", imageUrl: "https://cdn.example.com/a/{id}.png", count: 2 });
    expect(tokens[0].image).toBe("https://cdn.example.com/a/0.png");
    expect(tokens[1].image).toBe("https://cdn.example.com/a/1.png");
  });

  it("uses the same image when no placeholder is present", () => {
    const tokens = generateMetadata({ name: "A", imageUrl: "ipfs://QmSame/art.png", count: 2 });
    expect(tokens[0].image).toBe("ipfs://QmSame/art.png");
    expect(tokens[1].image).toBe("ipfs://QmSame/art.png");
  });

  it("attaches shared attributes and description", () => {
    const tokens = generateMetadata({
      name: "A",
      imageUrl: "x.png",
      count: 1,
      description: "AI generated",
      attributes: [{ trait_type: "Tier", value: "Gold" }],
    });
    expect(tokens[0].description).toBe("AI generated");
    expect(tokens[0].attributes).toEqual([{ trait_type: "Tier", value: "Gold" }]);
  });

  it("is deterministic for the same input", () => {
    const input = { name: "A", imageUrl: "x/{id}.png", count: 5 };
    expect(generateMetadata(input)).toEqual(generateMetadata(input));
  });

  it("supports 10000 tokens (the pipeline ceiling)", () => {
    const tokens = generateMetadata({ name: "Big", imageUrl: "x/{id}.png", count: 10000 });
    expect(tokens).toHaveLength(10000);
    expect(tokens[9999].name).toBe("Big #9999");
  });
});

describe("buildMetadataFormData", () => {
  it("appends one file part per token named <id>.json", () => {
    const tokens = generateMetadata({ name: "A", imageUrl: "x.png", count: 2 });
    const fd = buildMetadataFormData(tokens, "A");
    const files = fd.getAll("file");
    expect(files).toHaveLength(2);
    expect(fd.get("wrap_with_directory")).toBe("true");
    expect(fd.get("name")).toBe("A");
  });
});

describe("pinMetadataFolder", () => {
  it("parses the CID from the Pinata v3 response", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { cid: "QmFolderCid" } }),
    });
    vi.stubGlobal("fetch", fakeFetch);

    const tokens = generateMetadata({ name: "A", imageUrl: "x.png", count: 1 });
    const { baseUri } = await pinMetadataFolder(tokens, "A", "jwt-123");
    expect(baseUri).toBe("ipfs://QmFolderCid/");

    // The request must be multipart with the JWT auth header.
    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe("https://uploads.pinata.cloud/v3/files");
    expect(init.headers.Authorization).toBe("Bearer jwt-123");
    expect(init.body).toBeInstanceOf(FormData);
    vi.unstubAllGlobals();
  });

  it("throws a readable error when Pinata rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("rate limited") }),
    );
    const tokens = generateMetadata({ name: "A", imageUrl: "x.png", count: 1 });
    await expect(pinMetadataFolder(tokens, "A", "jwt")).rejects.toThrow(/Pinata v3 error: rate limited/);
    vi.unstubAllGlobals();
  });
});
