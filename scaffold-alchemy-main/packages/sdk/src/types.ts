/**
 * @nft-launchpad-kit/sdk — shared types.
 * Three-level mental model (approved baseline):
 *   Level 1 Goal API      — create / issue / generate / mint
 *   Level 2 Resource API  — get / list / verify
 *   Level 3 Primitive API — deploy / register
 */

export type ChainId = "sepolia" | "base-sepolia" | "localhost";

export interface CollectionInput {
  /** Collection name, e.g. "AI Founder Pass". */
  name: string;
  /** Ticker symbol, e.g. "AFP". */
  symbol: string;
  /** Total supply. */
  supply: number;
  /** Price per token in ETH (decimal string), e.g. "0.01". */
  price: string;
  /** Per-wallet mint limit (default 5). */
  maxPerWallet?: number;
}

export interface RegisterInput extends CollectionInput {
  contractAddress: string;
  ownerAddress: string;
  chainId: number;
  description?: string;
  coverImage?: string;
  baseURI?: string;
}

/** The platform's collection record (what the API returns). */
export interface Collection {
  id: string;
  name: string;
  symbol: string;
  maxSupply: number;
  mintPrice: string;
  maxPerWallet: number;
  contractAddress: string | null;
  chainId: number;
  status: string;
  baseURI: string | null;
  ownerId: string;
  createdAt: string;
}

export interface GrantInput {
  /** The collection's contract address (from create()/deploy()). */
  collectionAddress: string;
  /** The minter's wallet address. */
  minter: string;
  /** Number of tokens this grant allows. */
  quantity: number;
  /** Max mints this grant allows in total (default 5). */
  maxMint?: number;
  /** Unix expiry (default: now + 1h). */
  deadline?: number;
  /** Custom per-token price in wei (0 = collection price). */
  pricePerToken?: number;
  /** Agent identity to attribute the issuance to (audit trail). */
  agentAddress?: string;
}

export interface Grant {
  /** EIP-712 V2 signature. */
  signature: string;
  /** One-time grant id (replay protection). */
  uid: string;
  /** Unix expiry. */
  deadline: number;
  /** The signer (trusted signer address). */
  signer: string;
  /** Echoed from the request for mint(). */
  quantity: number;
  maxMint: number;
  pricePerToken: number;
}

export interface AgentInput {
  address: string;
  name: string;
  description?: string;
  capabilities?: string[];
}

export interface Agent extends AgentInput {
  id: string;
  createdAt: string;
}

export interface AgentDetail extends Agent {
  grants: AgentGrant[];
}

export interface AgentGrant {
  id: string;
  collectionAddress: string | null;
  minter: string | null;
  quantity: number | null;
  deadline: number | null;
  uid: string | null;
  status: string;
  createdAt: string;
}

export interface MetadataInput {
  /** Collection name — tokens are named "<name> #<id>". */
  name: string;
  /** Image URL, supports the {id} placeholder. */
  imageUrl: string;
  /** Token count (1..10000). */
  count: number;
  description?: string;
  attributes?: { trait_type: string; value: string }[];
}

export interface MetadataResult {
  baseUri?: string;
  count: number;
  mock?: boolean;
  dryRun?: boolean;
}

export interface MintResult {
  txHash: string;
}
