"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = exports.ApiError = void 0;
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}
exports.ApiError = ApiError;
/** Thin fetch wrapper over the platform REST API (Level 3 — API layer). */
class ApiClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async request(path, init) {
        const headers = { "Content-Type": "application/json" };
        if (this.config.apiKey) {
            headers.Authorization = `Bearer ${this.config.apiKey}`;
        }
        const res = await fetch(`${this.config.baseUrl}${path}`, {
            ...init,
            headers: { ...headers, ...(init?.headers ?? {}) },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
            throw new ApiError(res.status, body?.error ?? `Request failed with status ${res.status}`);
        }
        return body;
    }
}
exports.ApiClient = ApiClient;
