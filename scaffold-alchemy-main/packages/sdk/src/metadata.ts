import { ApiClient } from "./client.js";
import type { MetadataInput, MetadataResult } from "./types.js";

/** Metadata — the AI pipeline: generate + pin 1000 token metadata files in ONE request. */
export class Metadata {
  constructor(private client: ApiClient) {}

  async generate(input: MetadataInput): Promise<MetadataResult> {
    return this.client.request("/api/metadata/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
