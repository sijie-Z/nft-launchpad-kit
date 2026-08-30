import type { PrivateKeyAccount } from "viem/accounts";
import type { ChainId } from "./types.js";
export interface LaunchpadKitConfig {
    /** Base URL of your NFT Launchpad Kit instance. */
    baseUrl: string;
    /** Platform API key (required for cross-origin writes when the server sets PLATFORM_API_KEY). */
    apiKey?: string;
    /** Target chain: "sepolia" | "base-sepolia" | "localhost". */
    chain: ChainId;
    /** The wallet that acts as the agent (signs deployments, pays gas for deploy/mint). */
    wallet: PrivateKeyAccount;
    /** Optional RPC override (defaults to the chain's public RPC). */
    rpcUrl?: string;
}
export declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
/** Thin fetch wrapper over the platform REST API (Level 3 — API layer). */
export declare class ApiClient {
    private config;
    constructor(config: LaunchpadKitConfig);
    request<T>(path: string, init?: RequestInit): Promise<T>;
}
