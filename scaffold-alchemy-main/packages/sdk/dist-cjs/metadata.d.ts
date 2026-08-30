import { ApiClient } from "./client.js";
import type { MetadataInput, MetadataResult } from "./types.js";
/** Metadata — the AI pipeline: generate + pin 1000 token metadata files in ONE request. */
export declare class Metadata {
    private client;
    constructor(client: ApiClient);
    generate(input: MetadataInput): Promise<MetadataResult>;
}
