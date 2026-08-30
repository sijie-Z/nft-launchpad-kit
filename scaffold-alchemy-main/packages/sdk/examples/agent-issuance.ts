/**
 * Agent-native issuance demo — via @nft-launchpad-kit/sdk (dogfood).
 *
 * The AGENT (a program holding a key) does everything through the SDK:
 *   1. create a collection (deploy via Factory + register + trust the signer)
 *   2. issue a one-time mint grant for a user
 *   3. the user mints with the grant
 *
 * Prereqs (three terminals):
 *   # 1 — local chain
 *   cd scaffold-alchemy-main/packages/hardhat && npx hardhat node
 *   # 2 — deploy + platform server (SIGNER_PRIVATE_KEY must be the server signer)
 *   cd scaffold-alchemy-main && npx hardhat deploy --network localhost
 *   SIGNER_PRIVATE_KEY=… yarn workspace @scaffold-alchemy/nextjs dev
 *   # 3 — this demo
 *   cd packages/sdk && npx tsx examples/agent-issuance.ts
 */
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { LaunchpadKit } from "../src/index";

const agentKey = (process.env.AGENT_PRIVATE_KEY ??
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d") as `0x${string}`; // hardhat #1
const userKey = (process.env.USER_PRIVATE_KEY ??
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a") as `0x${string}`; // hardhat #2

const kit = new LaunchpadKit({
  baseUrl: process.env.BASE_URL ?? "http://127.0.0.1:56900",
  apiKey: process.env.NLA_API_KEY,
  chain: "localhost",
  wallet: privateKeyToAccount(agentKey),
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
});

async function main() {
  const agent = kit.config.wallet;
  const user = privateKeyToAccount(userKey);
  console.log(`[agent]  ${agent.address.slice(0, 10)}… starting (SDK @nft-launchpad-kit/sdk)`);

  // 0. Register the agent's identity (audit trail)
  await kit.agents.register({
    address: agent.address,
    name: "AgentClubBot",
    description: "SDK dogfood demo agent",
    capabilities: ["mint", "membership"],
  });
  console.log("[agent]  identity registered");

  // 1. Goal API: create a collection (deploy + trust the platform signer + register)
  const signer = await kit.grants.getSigner();
  const collection = await kit.collections.create(
    { name: "Agent Club", symbol: "AGT", supply: 1000, price: "0.01" },
    { trustedSigner: signer },
  );
  console.log(`[agent]  ✅ collection ${collection.name} @ ${collection.contractAddress?.slice(0, 10)}…`);

  // 2. Goal API: issue a one-time grant for the user
  const grant = await kit.grants.issue({
    collectionAddress: collection.contractAddress!,
    minter: user.address,
    quantity: 1,
    agentAddress: agent.address,
  });
  console.log(`[agent]  ✅ grant issued (uid ${grant.uid.slice(0, 10)}…)`);

  // 3. Goal API: the user mints (the minter's wallet pays)
  await kit.mint.execute({
    collectionAddress: collection.contractAddress!,
    grant,
    minter: user,
  });
  console.log("[user]   ✅ minted");

  // 4. Resource API: verify
  const owner = await kit.collections.get(collection.id);
  console.log(`[verify] collection status: ${owner.status}`);
  const uidUsed = await kit.grants.verify(collection.contractAddress!, grant.uid);
  console.log(`[verify] uid one-time: ${uidUsed} (true = consumed, reuse reverts)`);
  console.log("\n✅ Done — the agent issued, the user minted, all through the SDK.");
}

main().catch(err => {
  console.error("\n❌ demo failed:", err?.message ?? err);
  process.exit(1);
});
