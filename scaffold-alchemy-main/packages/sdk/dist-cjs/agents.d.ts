import { ApiClient } from "./client.js";
import type { Agent, AgentDetail, AgentInput } from "./types.js";
/** Agents — identity registry: register an agent, audit its issuance history. */
export declare class Agents {
    private client;
    constructor(client: ApiClient);
    register(input: AgentInput): Promise<Agent>;
    get(address: string): Promise<AgentDetail>;
}
