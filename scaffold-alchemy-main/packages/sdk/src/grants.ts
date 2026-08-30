import { createPublicClient, http } from "viem";
import type { Address } from "viem";
import { ApiClient, type LaunchpadKitConfig } from "./client.js";
import { kitAbi } from "./abis.js";
import { viemChain } from "./collections.js";
import type { Grant, GrantInput } from "./types.js";

const DEFAULT_MAX_MINT = 5;
const DEFAULT_DEADLINE_S = 3600; // 1 hour

/**
 * Grants — the core differentiator: a program signs, a user mints.
 *
 * Level 1: issue() — off-chain authorization via the platform signing service.
 * Level 2: verify() — on-chain one-time check (the UID is burned on first use).
 */
export class Grants {
  constructor(
    private client: ApiClient,
    private config: LaunchpadKitConfig,
  ) {}

  /** Issue a mint grant (EIP-712 V2, one-time UID, expiring). */
  async issue(input: GrantInput): Promise<Grant> {
    const deadline = input.deadline ?? Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_S;
    const maxMint = input.maxMint ?? DEFAULT_MAX_MINT;
    const pricePerToken = input.pricePerToken ?? 0;
    const res = await this.client.request<{ signature: string; uid: string; deadline: number; signer: string }>(
      "/api/signature",
      {
        method: "POST",
        body: JSON.stringify({
          minter: input.minter,
          quantity: input.quantity,
          maxMint,
          deadline,
          pricePerToken,
          contractAddress: input.collectionAddress,
          chainId: this.config.chain === "localhost" ? 31337 : this.config.chain === "sepolia" ? 11155111 : 84532,
          agentAddress: input.agentAddress,
        }),
      },
    );
    return { ...res, quantity: input.quantity, maxMint, pricePerToken };
  }

  /** The platform's signing address (what collections must trust via create({ trustedSigner })). */
  async getSigner(): Promise<string> {
    const res = await this.client.request<{ signer: string }>("/api/signature/config");
    return res.signer;
  }

  /** Verify a grant's UID is still unused on-chain (false after first mint). */
  async verify(collectionAddress: Address, uid: string): Promise<boolean> {
    const publicClient = createPublicClient({
      chain: viemChain(this.config.chain),
      transport: http(this.config.rpcUrl),
    });
    return publicClient.readContract({
      address: collectionAddress,
      abi: kitAbi,
      functionName: "isSignatureUsed",
      args: [uid as `0x${string}`],
    });
  }
}
