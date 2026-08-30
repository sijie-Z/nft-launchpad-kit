/**
 * Agent-native issuance demo — "the agent issues, the user mints"
 *
 * This script shows the full loop an AI agent can run on its own:
 *
 *   1. The AGENT creates a collection through the Factory
 *   2. The AGENT configures it (itself as the trusted signer)
 *   3. The AGENT signs a mint grant (EIP-712 V2 + one-time UID) for a user
 *   4. The USER mints with that grant — no approvals, no lists, no backend
 *
 * The "agent" here is just a private key held by a program. Swap the key
 * holder for any automation you like (scheduler, webhook, LLM tool call)
 * and you have agent-driven issuance: membership cards, rewards, gated
 * access, credentials — minted on demand.
 *
 * Prereqs (see README.md):
 *   npx hardhat node            # local chain
 *   npx hardhat deploy --network localhost   # deploys Factory + implementation
 *
 * Run:
 *   yarn demo        (or: npx tsx agent-issuance.ts)
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseEventLogs,
  toHex,
} from "viem";
import { hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Abi, Address, Hex } from "viem";
import { randomBytes } from "crypto";

// Deployment artifacts written by hardhat-deploy on the local chain.
import factoryDeployment from "../../packages/hardhat/deployments/localhost/NFTLaunchpadKitFactory.json";
import kitDeployment from "../../packages/hardhat/deployments/localhost/NFTLaunchpadKit.json";

// ---------------------------------------------------------------------------
// Setup — two actors: an AGENT (a program holding a key) and a USER
// ---------------------------------------------------------------------------

async function main() {
const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";

// Defaults are Hardhat's well-known local test accounts (dev only, never mainnet).
const agentKey = (process.env.AGENT_PRIVATE_KEY ??
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d") as Hex;
const userKey = (process.env.USER_PRIVATE_KEY ??
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a") as Hex;

const agent = privateKeyToAccount(agentKey); // the AI agent's wallet
const user = privateKeyToAccount(userKey); // a human user's wallet

const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) });
const agentWallet = createWalletClient({ account: agent, chain: hardhat, transport: http(rpcUrl) });
const userWallet = createWalletClient({ account: user, chain: hardhat, transport: http(rpcUrl) });

const factory = { address: factoryDeployment.address as Address, abi: factoryDeployment.abi as Abi } as const;

// Minimal typed ABI for the event we care about (keeps parseEventLogs fully typed).
const CollectionClonedAbi = [
  {
    type: "event",
    name: "CollectionCloned",
    inputs: [
      { type: "address", name: "cloneAddress", indexed: true },
      { type: "address", name: "owner", indexed: true },
      { type: "string", name: "name" },
      { type: "string", name: "symbol" },
      { type: "uint256", name: "maxSupply" },
    ],
  },
] as const;
const kitAbi = kitDeployment.abi as Abi;

const MINT_PRICE = parseEther("0.01"); // collection price (ETH)

// ---------------------------------------------------------------------------
// Step 1 — the AGENT creates a collection (one tx, ~371k gas via clone)
// ---------------------------------------------------------------------------

console.log(`[agent]  ${agent.address.slice(0, 10)}… creating collection "Agent Club"…`);
const createTx = await agentWallet.writeContract({
  ...factory,
  functionName: "deployCollection",
  args: ["Agent Club", "AGT", 1000, 5, MINT_PRICE],
});
const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
const [cloneEvent] = parseEventLogs({
  logs: createReceipt.logs,
  abi: CollectionClonedAbi,
  eventName: "CollectionCloned",
});
const collection = cloneEvent.args.cloneAddress as Address;
console.log(`[agent]  ✅ collection deployed at ${collection} (owner: agent)`);

const kit = { address: collection, abi: kitAbi } as const;

// ---------------------------------------------------------------------------
// Step 2 — the AGENT configures the collection: itself is the trusted signer.
// From here on, only signatures from this agent can authorize mints.
// ---------------------------------------------------------------------------

console.log("[agent]  configuring trusted signer…");
await agentWallet.writeContract({
  ...kit,
  functionName: "setTrustedSigner",
  args: [agent.address],
});
console.log("[agent]  ✅ trusted signer = agent");

// ---------------------------------------------------------------------------
// Step 3 — the AGENT signs a mint grant for the user.
// EIP-712 V2: one-time global UID, per-grant price, 1-hour expiry.
// ---------------------------------------------------------------------------

const uid = toHex(randomBytes(32));
const deadline = Math.floor(Date.now() / 1000) + 3600; // expires in 1h
const grant = {
  minter: user.address,
  quantity: 1n,
  maxMint: 5n, // max 5 total for this grant
  deadline: BigInt(deadline),
  pricePerToken: 0n, // 0 = use the collection's global price
  uid,
};

console.log(`[agent]  signing mint grant for ${user.address.slice(0, 10)}… (uid ${uid.slice(0, 10)}…)`);
const signature = await agent.signTypedData({
  domain: { name: "NFT Launchpad Kit", version: "1", chainId: hardhat.id, verifyingContract: collection },
  types: {
    MintAuthorizationV2: [
      { name: "minter", type: "address" },
      { name: "quantity", type: "uint256" },
      { name: "maxMint", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "pricePerToken", type: "uint256" },
      { name: "uid", type: "bytes32" },
    ],
  },
  primaryType: "MintAuthorizationV2",
  message: grant,
});
console.log("[agent]  ✅ grant signed — handing it to the user");

// ---------------------------------------------------------------------------
// Step 4 — the USER mints using the agent's signature.
// The contract verifies the signature on-chain and mints the NFT.
// ---------------------------------------------------------------------------

console.log(`[user]   minting with agent's signature…`);
const mintTx = await userWallet.writeContract({
  ...kit,
  functionName: "mintWithSignature712V2",
  args: [grant.quantity, grant.maxMint, grant.deadline, grant.pricePerToken, grant.uid, signature],
  value: MINT_PRICE,
});
await publicClient.waitForTransactionReceipt({ hash: mintTx });
console.log("[user]   ✅ minted");

// ---------------------------------------------------------------------------
// Step 5 — verify
// ---------------------------------------------------------------------------

const ownerOf0 = (await publicClient.readContract({
  ...kit,
  functionName: "ownerOf",
  args: [0n],
})) as Address;
const supply = await publicClient.readContract({ ...kit, functionName: "totalSupply" });
const uidUsed = await publicClient.readContract({ ...kit, functionName: "isSignatureUsed", args: [grant.uid] });

console.log("\n— summary —");
console.log(`  collection:    ${collection}`);
console.log(`  total supply:  ${supply}`);
console.log(`  token #0 owner:${ownerOf0}  (user: ${user.address})`);
console.log(`  grant uid used:${uidUsed} (one-time — reuse will revert)`);

if (ownerOf0.toLowerCase() !== user.address.toLowerCase()) {
  throw new Error("verification failed: token #0 is not owned by the user");
}
console.log("\n✅ Agent-native issuance loop completed: agent created → agent signed → user minted");
}

main().catch(err => {
  console.error("\n❌ demo failed:", err.message ?? err);
  process.exit(1);
});
