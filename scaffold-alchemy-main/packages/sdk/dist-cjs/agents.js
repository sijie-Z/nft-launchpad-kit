"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agents = void 0;
/** Agents — identity registry: register an agent, audit its issuance history. */
class Agents {
    client;
    constructor(client) {
        this.client = client;
    }
    async register(input) {
        return this.client.request("/api/agents", { method: "POST", body: JSON.stringify(input) });
    }
    async get(address) {
        return this.client.request(`/api/agents/${address.toLowerCase()}`);
    }
}
exports.Agents = Agents;
