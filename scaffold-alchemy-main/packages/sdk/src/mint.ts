import { createPublicClient, createWalletClient, http } from "viem";
import type { Address } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { ApiClient, type LaunchpadKitConfig } from "./client";
import { kitAbi } from "./abis";
import { viemChain } from "./collections";
import type { Grant, MintResult } from "./types";

/**
 * Mint — Level 1: execute a mint with a signed grant.
 * The minter's wallet pays the mint price + gas; the contract verifies the
 * signature on-chain (signer, deadline, one-time UID) before minting.
 * IMPORTANT: the NFT is minted to msg.sender — pass the MINTER's wallet here
 * (the agent holds the grant, the user executes it).
 */
export class Mint {
  constructor(
    private client: ApiClient,
    private config: LaunchpadKitConfig,
  ) {}

  async execute(input: {
    collectionAddress: Address;
    grant: Grant;
    quantity?: bigint;
    /** The wallet that executes the mint (pays price + gas). Defaults to the agent wallet. */
    minter?: PrivateKeyAccount;
  }): Promise<MintResult> {
    const chain = viemChain(this.config.chain);
    const publicClient = createPublicClient({ chain, transport: http(this.config.rpcUrl) });
    const signer = input.minter ?? this.config.wallet;
    const walletClient = createWalletClient({ account: signer, chain, transport: http(this.config.rpcUrl) });

    // The signature was issued over the grant's pricePerToken (0 = collection
    // price). The CONTRACT arg must be exactly what was signed; the VALUE uses
    // the resolved price. Passing the resolved price here would break the
    // structHash and revert with BadSignature.
    const signedPrice = BigInt(input.grant.pricePerToken);
    const resolvedPrice =
      signedPrice > 0n
        ? signedPrice
        : await publicClient.readContract({
            address: input.collectionAddress,
            abi: kitAbi,
            functionName: "mintPrice",
          });
    const quantity = input.quantity ?? 1n;

    const txHash = await walletClient.writeContract({
      address: input.collectionAddress,
      abi: kitAbi,
      functionName: "mintWithSignature712V2",
      args: [
        quantity,
        BigInt(input.grant.maxMint),
        BigInt(input.grant.deadline),
        signedPrice,
        input.grant.uid as `0x${string}`,
        input.grant.signature as `0x${string}`,
      ],
      value: resolvedPrice * quantity,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash };
  }
}
