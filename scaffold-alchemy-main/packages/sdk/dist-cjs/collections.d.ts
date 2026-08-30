import type { Address, Chain } from "viem";
import { ApiClient, type LaunchpadKitConfig } from "./client.js";
import type { ChainId, Collection, CollectionInput, RegisterInput } from "./types.js";
export declare function viemChain(chain: ChainId): Chain;
/** Collections — Level 1 create() (goal), Level 2 get/list (resources), Level 3 deploy/register (primitives). */
export declare class Collections {
    private client;
    private config;
    constructor(client: ApiClient, config: LaunchpadKitConfig);
    /** Deploy a collection via the Factory (clone, ~371k gas). The wallet pays gas. */
    deploy(input: CollectionInput): Promise<{
        contractAddress: Address;
    }>;
    /** Register an already-deployed collection in the platform backend. */
    register(input: RegisterInput): Promise<Collection>;
    /**
     * Deploy + register in one call — the "10-minute issuance" path.
     * @param opts.trustedSigner — address authorized to sign grants for this
     *   collection (typically the platform signer, see grants.getSigner()).
     */
    create(input: CollectionInput, opts?: {
        trustedSigner?: Address;
    }): Promise<Collection>;
    get(id: string): Promise<Collection>;
    list(params?: Record<string, string | number>): Promise<{
        collections: Collection[];
        total: number;
    }>;
}
