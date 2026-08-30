import { Agents } from "./agents";
import { ApiClient, type LaunchpadKitConfig } from "./client";
import { Collections } from "./collections";
import { Grants } from "./grants";
import { Metadata } from "./metadata";
import { Mint } from "./mint";

export type { LaunchpadKitConfig, ApiError } from "./client";
export * from "./types";

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
export class LaunchpadKit {
  readonly agents: Agents;
  readonly collections: Collections;
  readonly grants: Grants;
  readonly metadata: Metadata;
  readonly mint: Mint;
  readonly config: LaunchpadKitConfig;

  constructor(config: LaunchpadKitConfig) {
    this.config = config;
    const client = new ApiClient(config);
    this.agents = new Agents(client);
    this.collections = new Collections(client, config);
    this.grants = new Grants(client, config);
    this.metadata = new Metadata(client);
    this.mint = new Mint(client, config);
  }
}
