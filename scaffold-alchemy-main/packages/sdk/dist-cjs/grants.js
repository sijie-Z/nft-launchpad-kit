"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grants = void 0;
const viem_1 = require("viem");
const abis_js_1 = require("./abis.js");
const collections_js_1 = require("./collections.js");
const DEFAULT_MAX_MINT = 5;
const DEFAULT_DEADLINE_S = 3600; // 1 hour
/**
 * Grants — the core differentiator: a program signs, a user mints.
 *
 * Level 1: issue() — off-chain authorization via the platform signing service.
 * Level 2: verify() — on-chain one-time check (the UID is burned on first use).
 */
class Grants {
    client;
    config;
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }
    /** Issue a mint grant (EIP-712 V2, one-time UID, expiring). */
    async issue(input) {
        const deadline = input.deadline ?? Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_S;
        const maxMint = input.maxMint ?? DEFAULT_MAX_MINT;
        const pricePerToken = input.pricePerToken ?? 0;
        const res = await this.client.request("/api/signature", {
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
        });
        return { ...res, quantity: input.quantity, maxMint, pricePerToken };
    }
    /** The platform's signing address (what collections must trust via create({ trustedSigner })). */
    async getSigner() {
        const res = await this.client.request("/api/signature/config");
        return res.signer;
    }
    /** Verify a grant's UID is still unused on-chain (false after first mint). */
    async verify(collectionAddress, uid) {
        const publicClient = (0, viem_1.createPublicClient)({
            chain: (0, collections_js_1.viemChain)(this.config.chain),
            transport: (0, viem_1.http)(this.config.rpcUrl),
        });
        return publicClient.readContract({
            address: collectionAddress,
            abi: abis_js_1.kitAbi,
            functionName: "isSignatureUsed",
            args: [uid],
        });
    }
}
exports.Grants = Grants;
