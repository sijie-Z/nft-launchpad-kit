import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseEventLogs,
} from "viem";
import { baseSepolia, hardhat, sepolia } from "viem/chains";
import type { Address, Chain } from "viem";
import { ApiClient, type LaunchpadKitConfig } from "./client";
import { factoryAbi, kitAbi } from "./abis";
import type { ChainId, Collection, CollectionInput, RegisterInput } from "./types";

const FACTORY_ADDRESSES: Record<ChainId, Address | null> = {
  sepolia: "0x1e320041d3106022965C7846EE7bcbceab65a8e1",
  "base-sepolia": null, // set after Phase 0 deploy
  localhost: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

const CHAIN_IDS: Record<ChainId, number> = { sepolia: 11155111, "base-sepolia": 84532, localhost: 31337 };

export function viemChain(chain: ChainId): Chain {
  switch (chain) {
    case "sepolia":
      return sepolia;
    case "base-sepolia":
      return baseSepolia;
    default:
      return hardhat;
  }
}

/** Collections — Level 1 create() (goal), Level 2 get/list (resources), Level 3 deploy/register (primitives). */
export class Collections {
  constructor(
    private client: ApiClient,
    private config: LaunchpadKitConfig,
  ) {}

  // ── Level 3: chain primitive ──────────────────────────────────────────────

  /** Deploy a collection via the Factory (clone, ~371k gas). The wallet pays gas. */
  async deploy(input: CollectionInput): Promise<{ contractAddress: Address }> {
    const factory = FACTORY_ADDRESSES[this.config.chain];
    if (!factory) {
      throw new Error(`Factory not configured for chain "${this.config.chain}" — deploy it first (Phase 0).`);
    }
    const chain = viemChain(this.config.chain);
    const publicClient = createPublicClient({ chain, transport: http(this.config.rpcUrl) });
    const walletClient = createWalletClient({ account: this.config.wallet, chain, transport: http(this.config.rpcUrl) });

    const txHash = await walletClient.writeContract({
      address: factory,
      abi: factoryAbi,
      functionName: "deployCollection",
      args: [input.name, input.symbol, BigInt(input.supply), BigInt(input.maxPerWallet ?? 5), parseEther(input.price)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const [event] = parseEventLogs({ logs: receipt.logs, abi: factoryAbi, eventName: "CollectionCloned" });
    if (!event) throw new Error("Deploy succeeded but CollectionCloned event was not found");
    return { contractAddress: event.args.cloneAddress };
  }

  // ── Level 3: API primitive ────────────────────────────────────────────────

  /** Register an already-deployed collection in the platform backend. */
  async register(input: RegisterInput): Promise<Collection> {
    return this.client.request("/api/collections", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        symbol: input.symbol,
        maxSupply: input.supply,
        mintPrice: input.price,
        maxPerWallet: input.maxPerWallet ?? 5,
        contractAddress: input.contractAddress,
        ownerAddress: input.ownerAddress,
        chainId: input.chainId,
        description: input.description,
        coverImage: input.coverImage,
        baseURI: input.baseURI,
      }),
    });
  }

  // ── Level 1: goal ─────────────────────────────────────────────────────────

  /**
   * Deploy + register in one call — the "10-minute issuance" path.
   * @param opts.trustedSigner — address authorized to sign grants for this
   *   collection (typically the platform signer, see grants.getSigner()).
   */
  async create(input: CollectionInput, opts?: { trustedSigner?: Address }): Promise<Collection> {
    const { contractAddress } = await this.deploy(input);
    if (opts?.trustedSigner) {
      const chain = viemChain(this.config.chain);
      const walletClient = createWalletClient({
        account: this.config.wallet,
        chain,
        transport: http(this.config.rpcUrl),
      });
      await walletClient.writeContract({
        address: contractAddress,
        abi: kitAbi,
        functionName: "setTrustedSigner",
        args: [opts.trustedSigner],
      });
    }
    return this.register({
      ...input,
      contractAddress,
      ownerAddress: this.config.wallet.address,
      chainId: CHAIN_IDS[this.config.chain],
    });
  }

  // ── Level 2: resources ────────────────────────────────────────────────────

  async get(id: string): Promise<Collection> {
    return this.client.request(`/api/collections/${id}`);
  }

  async list(params: Record<string, string | number> = {}): Promise<{ collections: Collection[]; total: number }> {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return this.client.request(`/api/collections${qs ? `?${qs}` : ""}`);
  }
}
