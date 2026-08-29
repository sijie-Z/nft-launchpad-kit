/**
 * AI metadata pipeline utilities (#36).
 *
 * Generates ERC-721 metadata JSON for a whole collection and pins the
 * folder to IPFS in ONE request (Pinata v3 uploads API, wrap_with_directory),
 * returning a single base URI: ipfs://<folder-cid>/0.json … ipfs://<folder-cid>/N.json
 */

export interface MetadataAttributes {
  trait_type: string;
  value: string;
}

export interface MetadataGenerationInput {
  /** Collection name — each token is named "<name> #<id>". */
  name: string;
  /** Shared description for every token. */
  description?: string;
  /**
   * Token image. Supports the `{id}` placeholder, e.g.
   * "https://cdn.example.com/agents/{id}.png" — replaced per token.
   */
  imageUrl: string;
  /** Number of tokens to generate (1..10000). */
  count: number;
  /** Attributes shared by every token (AI-style traits). */
  attributes?: MetadataAttributes[];
}

export interface GeneratedToken {
  name: string;
  description: string;
  image: string;
  attributes: MetadataAttributes[];
}

/** Generate deterministic metadata for every token of a collection. */
export function generateMetadata(input: MetadataGenerationInput): GeneratedToken[] {
  const { name, description = "", imageUrl, count, attributes = [] } = input;
  const tokens: GeneratedToken[] = [];
  for (let i = 0; i < count; i++) {
    tokens.push({
      name: `${name} #${i}`,
      description,
      image: imageUrl.includes("{id}") ? imageUrl.replaceAll("{id}", String(i)) : imageUrl,
      attributes: [...attributes],
    });
  }
  return tokens;
}

/** Build the multipart form for Pinata v3: one file part per token, wrapped in a directory. */
export function buildMetadataFormData(tokens: GeneratedToken[], folderName: string): FormData {
  const fd = new FormData();
  tokens.forEach((token, i) => {
    fd.append("file", new File([JSON.stringify(token)], `${i}.json`, { type: "application/json" }));
  });
  fd.append("name", folderName);
  fd.append("wrap_with_directory", "true");
  return fd;
}

/** Upload the whole metadata folder in one request; returns ipfs://<cid>/. */
export async function pinMetadataFolder(
  tokens: GeneratedToken[],
  folderName: string,
  jwt: string,
): Promise<{ baseUri: string }> {
  const fd = buildMetadataFormData(tokens, folderName);
  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata v3 error: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const cid = data?.data?.cid ?? data?.cid;
  if (!cid) throw new Error("Pinata response is missing a CID");
  return { baseUri: `ipfs://${cid}/` };
}
