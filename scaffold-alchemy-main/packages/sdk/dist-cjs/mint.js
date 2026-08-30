"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mint = void 0;
const viem_1 = require("viem");
const abis_js_1 = require("./abis.js");
const collections_js_1 = require("./collections.js");
/**
 * Mint — Level 1: execute a mint with a signed grant.
 * The minter's wallet pays the mint price + gas; the contract verifies the
 * signature on-chain (signer, deadline, one-time UID) before minting.
 * IMPORTANT: the NFT is minted to msg.sender — pass the MINTER's wallet here
 * (the agent holds the grant, the user executes it).
 */
class Mint {
    client;
    config;
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }
    async execute(input) {
        const chain = (0, collections_js_1.viemChain)(this.config.chain);
        const publicClient = (0, viem_1.createPublicClient)({ chain, transport: (0, viem_1.http)(this.config.rpcUrl) });
        const signer = input.minter ?? this.config.wallet;
        const walletClient = (0, viem_1.createWalletClient)({ account: signer, chain, transport: (0, viem_1.http)(this.config.rpcUrl) });
        // The signature was issued over the grant's pricePerToken (0 = collection
        // price). The CONTRACT arg must be exactly what was signed; the VALUE uses
        // the resolved price. Passing the resolved price here would break the
        // structHash and revert with BadSignature.
        const signedPrice = BigInt(input.grant.pricePerToken);
        const resolvedPrice = signedPrice > 0n
            ? signedPrice
            : await publicClient.readContract({
                address: input.collectionAddress,
                abi: abis_js_1.kitAbi,
                functionName: "mintPrice",
            });
        const quantity = input.quantity ?? 1n;
        const txHash = await walletClient.writeContract({
            address: input.collectionAddress,
            abi: abis_js_1.kitAbi,
            functionName: "mintWithSignature712V2",
            args: [
                quantity,
                BigInt(input.grant.maxMint),
                BigInt(input.grant.deadline),
                signedPrice,
                input.grant.uid,
                input.grant.signature,
            ],
            value: resolvedPrice * quantity,
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }
}
exports.Mint = Mint;
