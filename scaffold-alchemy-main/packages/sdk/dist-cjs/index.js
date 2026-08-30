"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchpadKit = void 0;
const agents_js_1 = require("./agents.js");
const client_js_1 = require("./client.js");
const collections_js_1 = require("./collections.js");
const grants_js_1 = require("./grants.js");
const metadata_js_1 = require("./metadata.js");
const mint_js_1 = require("./mint.js");
__exportStar(require("./types.js"), exports);
/**
 * @nft-launchpad-kit/sdk — Agent-native NFT issuance.
 *
 *   const kit = new LaunchpadKit({ baseUrl, apiKey, chain, wallet });
 *   const collection = await kit.collections.create({ name, symbol, supply, price });
 *   const grant = await kit.grants.issue({ collectionAddress: collection.contractAddress, minter, quantity });
 *   await kit.mint.execute({ collectionAddress: collection.contractAddress, grant });
 *
 * Three-level model:
 *   Level 1 Goal API      — collections.create / grants.issue / metadata.generate / mint.execute
 *   Level 2 Resource API  — collections.get / collections.list / grants.verify / agents.get
 *   Level 3 Primitive API — collections.deploy / collections.register
 */
class LaunchpadKit {
    agents;
    collections;
    grants;
    metadata;
    mint;
    config;
    constructor(config) {
        this.config = config;
        const client = new client_js_1.ApiClient(config);
        this.agents = new agents_js_1.Agents(client);
        this.collections = new collections_js_1.Collections(client, config);
        this.grants = new grants_js_1.Grants(client, config);
        this.metadata = new metadata_js_1.Metadata(client);
        this.mint = new mint_js_1.Mint(client, config);
    }
}
exports.LaunchpadKit = LaunchpadKit;
