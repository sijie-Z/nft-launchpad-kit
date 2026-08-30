import { Agents } from "./agents.js";
import { type LaunchpadKitConfig } from "./client.js";
import { Collections } from "./collections.js";
import { Grants } from "./grants.js";
import { Metadata } from "./metadata.js";
import { Mint } from "./mint.js";
export type { LaunchpadKitConfig, ApiError } from "./client.js";
export * from "./types.js";
/**
 * @nft-launchpad-kit/sdk — Agent-native NFT issuance.
 *
 *   const kit = new LaunchpadKit({ baseUrl, apiKey, chain, wallet });
 *   const collection = await kit.collections.create({ name, symbol, supply, price });
 *   const grant = await kit.grants.issue({ collectionAddress: collection.contractAddress, minter, quantity });
 *   await kit.mint.execute({ collectionAddress: collection.contractAddress, grant });
 *
 * Three-level model:
 *   Level 1 Goal API      — collections.create / grants.issue / metadata.generate / mint.execute
 *   Level 2 Resource API  — collections.get / collections.list / grants.verify / agents.get
 *   Level 3 Primitive API — collections.deploy / collections.register
 */
export declare class LaunchpadKit {
    readonly agents: Agents;
    readonly collections: Collections;
    readonly grants: Grants;
    readonly metadata: Metadata;
    readonly mint: Mint;
    readonly config: LaunchpadKitConfig;
    constructor(config: LaunchpadKitConfig);
}
