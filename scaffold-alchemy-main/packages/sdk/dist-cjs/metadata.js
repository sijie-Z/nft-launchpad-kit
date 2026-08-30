"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metadata = void 0;
/** Metadata — the AI pipeline: generate + pin 1000 token metadata files in ONE request. */
class Metadata {
    client;
    constructor(client) {
        this.client = client;
    }
    async generate(input) {
        return this.client.request("/api/metadata/generate", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }
}
exports.Metadata = Metadata;
