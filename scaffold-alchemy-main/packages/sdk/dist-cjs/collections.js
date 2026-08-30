"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collections = void 0;
exports.viemChain = viemChain;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const abis_js_1 = require("./abis.js");
const FACTORY_ADDRESSES = {
    sepolia: "0x1e320041d3106022965C7846EE7bcbceab65a8e1",
    "base-sepolia": null, // set after Phase 0 deploy
    localhost: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};
const CHAIN_IDS = { sepolia: 11155111, "base-sepolia": 84532, localhost: 31337 };
function viemChain(chain) {
    switch (chain) {
        case "sepolia":
            return chains_1.sepolia;
        case "base-sepolia":
            return chains_1.baseSepolia;
        default:
            return chains_1.hardhat;
    }
}
/** Collections — Level 1 create() (goal), Level 2 get/list (resources), Level 3 deploy/register (primitives). */
class Collections {
    client;
    config;
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }
    // ── Level 3: chain primitive ──────────────────────────────────────────────
    /** Deploy a collection via the Factory (clone, ~371k gas). The wallet pays gas. */
    async deploy(input) {
        const factory = FACTORY_ADDRESSES[this.config.chain];
        if (!factory) {
            throw new Error(`Factory not configured for chain "${this.config.chain}" — deploy it first (Phase 0).`);
        }
        const chain = viemChain(this.config.chain);
        const publicClient = (0, viem_1.createPublicClient)({ chain, transport: (0, viem_1.http)(this.config.rpcUrl) });
        const walletClient = (0, viem_1.createWalletClient)({ account: this.config.wallet, chain, transport: (0, viem_1.http)(this.config.rpcUrl) });
        const txHash = await walletClient.writeContract({
            address: factory,
            abi: abis_js_1.factoryAbi,
            functionName: "deployCollection",
            args: [input.name, input.symbol, BigInt(input.supply), BigInt(input.maxPerWallet ?? 5), (0, viem_1.parseEther)(input.price)],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        const [event] = (0, viem_1.parseEventLogs)({ logs: receipt.logs, abi: abis_js_1.factoryAbi, eventName: "CollectionCloned" });
        if (!event)
            throw new Error("Deploy succeeded but CollectionCloned event was not found");
        return { contractAddress: event.args.cloneAddress };
    }
    // ── Level 3: API primitive ────────────────────────────────────────────────
    /** Register an already-deployed collection in the platform backend. */
    async register(input) {
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
    async create(input, opts) {
        const { contractAddress } = await this.deploy(input);
        if (opts?.trustedSigner) {
            const chain = viemChain(this.config.chain);
            const walletClient = (0, viem_1.createWalletClient)({
                account: this.config.wallet,
                chain,
                transport: (0, viem_1.http)(this.config.rpcUrl),
            });
            await walletClient.writeContract({
                address: contractAddress,
                abi: abis_js_1.kitAbi,
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
    async get(id) {
        return this.client.request(`/api/collections/${id}`);
    }
    async list(params = {}) {
        const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
        return this.client.request(`/api/collections${qs ? `?${qs}` : ""}`);
    }
}
exports.Collections = Collections;
