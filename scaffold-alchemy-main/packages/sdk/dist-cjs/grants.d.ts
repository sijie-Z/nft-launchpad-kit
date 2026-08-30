import type { Address } from "viem";
import { ApiClient, type LaunchpadKitConfig } from "./client.js";
import type { Grant, GrantInput } from "./types.js";
/**
 * Grants — the core differentiator: a program signs, a user mints.
 *
 * Level 1: issue() — off-chain authorization via the platform signing service.
 * Level 2: verify() — on-chain one-time check (the UID is burned on first use).
 */
export declare class Grants {
    private client;
    private config;
    constructor(client: ApiClient, config: LaunchpadKitConfig);
    /** Issue a mint grant (EIP-712 V2, one-time UID, expiring). */
    issue(input: GrantInput): Promise<Grant>;
    /** The platform's signing address (what collections must trust via create({ trustedSigner })). */
    getSigner(): Promise<string>;
    /** Verify a grant's UID is still unused on-chain (false after first mint). */
    verify(collectionAddress: Address, uid: string): Promise<boolean>;
}
