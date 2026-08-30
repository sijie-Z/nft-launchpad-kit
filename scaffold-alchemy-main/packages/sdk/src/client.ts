import type { PrivateKeyAccount } from "viem/accounts";
import type { ChainId } from "./types";

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

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thin fetch wrapper over the platform REST API (Level 3 — API layer). */
export class ApiClient {
  constructor(private config: LaunchpadKitConfig) {}

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, body?.error ?? `Request failed with status ${res.status}`);
    }
    return body as T;
  }
}
