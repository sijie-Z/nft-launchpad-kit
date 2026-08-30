import { ApiClient } from "./client.js";
import type { Agent, AgentDetail, AgentInput } from "./types.js";

/** Agents — identity registry: register an agent, audit its issuance history. */
export class Agents {
  constructor(private client: ApiClient) {}

  async register(input: AgentInput): Promise<Agent> {
    return this.client.request("/api/agents", { method: "POST", body: JSON.stringify(input) });
  }

  async get(address: string): Promise<AgentDetail> {
    return this.client.request(`/api/agents/${address.toLowerCase()}`);
  }
}
