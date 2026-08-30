import type { Address } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { ApiClient, type LaunchpadKitConfig } from "./client.js";
import type { Grant, MintResult } from "./types.js";
/**
 * Mint — Level 1: execute a mint with a signed grant.
 * The minter's wallet pays the mint price + gas; the contract verifies the
 * signature on-chain (signer, deadline, one-time UID) before minting.
 * IMPORTANT: the NFT is minted to msg.sender — pass the MINTER's wallet here
 * (the agent holds the grant, the user executes it).
 */
export declare class Mint {
    private client;
    private config;
    constructor(client: ApiClient, config: LaunchpadKitConfig);
    execute(input: {
        collectionAddress: Address;
        grant: Grant;
        quantity?: bigint;
        /** The wallet that executes the mint (pays price + gas). Defaults to the agent wallet. */
        minter?: PrivateKeyAccount;
    }): Promise<MintResult>;
}
