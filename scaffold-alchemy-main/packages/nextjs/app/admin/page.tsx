"use client";

import { useCallback, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { AdminDashboard } from "~~/components/AdminDashboard";
import { AdminEventLog } from "~~/components/AdminEventLog";
import { WhitelistManager } from "~~/components/WhitelistManager";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-alchemy";
import { mapContractError } from "~~/utils/errorMap";
import { notification } from "~~/utils/scaffold-alchemy";

// ─── Validation helpers ───
const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
const isValidBps = (bps: string) => {
  const n = Number(bps);
  return !isNaN(n) && n >= 0 && n <= 10000 && Number.isInteger(n);
};
const isValidPrice = (p: string) => {
  const n = Number(p);
  return !isNaN(n) && n >= 0;
};
// ─── Confirmation dialog ───
function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-base-100 rounded-2xl shadow-2xl max-w-sm w-full p-6 slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-xs text-base-content/50 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-warning btn-sm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

type Tab = "sale" | "auction" | "whitelist" | "royalty" | "payout" | "signer" | "erc20" | "withdraw";

const TABS: { key: Tab; icon: string; label: string; desc: string }[] = [
  { key: "sale", icon: "⚡", label: "Sale Control", desc: "Toggle sale states, price, limits, metadata" },
  { key: "auction", icon: "📉", label: "Dutch Auction", desc: "Configure auction pricing parameters" },
  { key: "whitelist", icon: "📋", label: "Whitelist", desc: "Manage Merkle root for allowlist" },
  { key: "royalty", icon: "💰", label: "Royalty", desc: "Set EIP-2981 royalty receiver and rate" },
  { key: "payout", icon: "🔀", label: "Revenue Split", desc: "Configure multi-address payout distribution" },
  { key: "signer", icon: "✍️", label: "Trusted Signer", desc: "Set address for signature-based minting" },
  { key: "erc20", icon: "🪙", label: "ERC20 Payment", desc: "Configure ERC20 token payment" },
  { key: "withdraw", icon: "🏧", label: "Withdraw", desc: "Withdraw ETH or tokens from contract" },
];

// DEFAULT_ADMIN_ROLE = 0x00...00 (bytes32 zero)
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("sale");
  const { address } = useAccount();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "NFTLaunchpadKit" });

  // Check if connected wallet has admin role
  const { data: isAdmin } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "hasRole",
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
  });

  // Read states
  const { data: saleOn } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "saleIsActive" });
  const { data: allowOn } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "allowlistSaleIsActive",
  });
  const { data: paused } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "paused" });
  const { data: curPrice } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "mintPrice" });
  const { data: curPerWallet } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "maxPerWallet",
  });
  const { data: curRoot } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "allowlistMerkleRoot",
  });
  const { data: recipients } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "payoutRecipients",
  });
  const { data: bpsArr } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "payoutBps" });
  const { data: curSigner } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "trustedSigner",
  });
  const { data: curToken } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "acceptedToken",
  });
  const { data: curTokenPrice } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "tokenMintPrice",
  });
  const { data: minted } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "_tokenIdTracker",
  });
  const { data: supply } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "maxSupply" });

  // Form state
  const [fPrice, setFPrice] = useState("0.01");
  const [fPerWallet, setFPerWallet] = useState("5");
  const [fAStartP, setFAStartP] = useState("0.05");
  const [fAEndP, setFAEndP] = useState("0.01");
  const [fAStartT, setFAStartT] = useState("");
  const [fADur, setFADur] = useState("3600");
  const [fRoot, setFRoot] = useState("");
  const [fRoyAddr, setFRoyAddr] = useState("");
  const [fRoyBps, setFRoyBps] = useState("500");
  const [fPayAddrs, setFPayAddrs] = useState("");
  const [fPayBps, setFPayBps] = useState("");
  const [fSigner, setFSigner] = useState("");
  const [fToken, setFToken] = useState("");
  const [fTokenP, setFTokenP] = useState("0.01");
  const [fBaseURI, setFBaseURI] = useState("");
  const [fPreURI, setFPreURI] = useState("");
  const [fCommit, setFCommit] = useState("");
  const [fSeed, setFSeed] = useState("");

  // Confirmation dialog state
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; desc: string; action: () => void }>({
    open: false,
    title: "",
    desc: "",
    action: () => {},
  });

  const tx = useCallback(
    async (fn: string, args?: any[], value?: bigint) => {
      try {
        const r = await writeContractAsync({
          functionName: fn,
          args: args || [],
          ...(value !== undefined ? { value } : {}),
        });
        if (r) notification.success(`${fn} submitted!`);
      } catch (e: any) {
        notification.error(mapContractError(e));
      }
    },
    [writeContractAsync],
  );

  // Wrapper for dangerous actions (withdraw, pause, etc.)
  const confirmTx = useCallback(
    (title: string, desc: string, fn: string, args?: any[], value?: bigint) => {
      setConfirm({ open: true, title, desc, action: () => tx(fn, args, value) });
    },
    [tx],
  );

  const meta = TABS.find(t => t.key === tab)!;

  if (address && isAdmin === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/40 text-sm">Checking permissions...</p>
      </div>
    );
  }

  if (address && isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v2"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center">Access Restricted</h2>
        <p className="text-base-content/50 text-center max-w-md">
          Your wallet ({address.slice(0, 6)}...{address.slice(-4)}) does not have the Admin role. Connect with the
          contract owner wallet to access this panel.
        </p>
        <div className="badge badge-warning">Not an Admin</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      {/* Dashboard metrics */}
      <AdminDashboard />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-20">
            <h1 className="text-xl font-black mb-1">Admin Panel</h1>
            <p className="text-[11px] text-base-content/30 mb-4">Contract Management</p>

            {/* Status card */}
            <div className="rounded-2xl bg-base-200/40 border border-base-content/5 p-4 mb-4 space-y-2.5 text-sm">
              <StatusRow label="Status" ok={!paused} okText="Running" failText="Paused" />
              <StatusRow label="Public Sale" ok={!!saleOn} />
              <StatusRow label="Allowlist" ok={!!allowOn} />
              <div className="flex justify-between">
                <span className="text-base-content/40">Minted</span>
                <span className="font-bold">
                  {minted?.toString() || "0"} / {supply?.toString() || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/40">Price</span>
                <span className="font-bold">{curPrice ? formatEther(curPrice) : "—"} ETH</span>
              </div>
            </div>

            {/* Nav */}
            <ul className="space-y-1 mb-4">
              {TABS.map(t => (
                <li key={t.key}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-150 ${tab === t.key ? "bg-primary text-primary-content font-semibold shadow-md" : "hover:bg-base-200 text-base-content/70"}`}
                    onClick={() => setTab(t.key)}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Event log (desktop only) */}
            <div className="hidden lg:block">
              <AdminEventLog />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <span>{meta.icon}</span>
              {meta.label}
            </h2>
            <p className="text-sm text-base-content/40 mt-0.5">{meta.desc}</p>
          </div>

          {tab === "sale" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Toggle
                  label="Public Sale"
                  active={!!saleOn}
                  onToggle={() => tx("setSaleState", [!saleOn])}
                  loading={isMining}
                />
                <Toggle
                  label="Allowlist"
                  active={!!allowOn}
                  onToggle={() => tx("setAllowlistSaleState", [!allowOn])}
                  loading={isMining}
                />
                <Toggle
                  label="Contract"
                  active={!paused}
                  okText="Running"
                  failText="Paused"
                  onToggle={() =>
                    confirmTx(
                      paused ? "Unpause Contract" : "Pause Contract",
                      paused
                        ? "This will re-enable all minting operations."
                        : "This will immediately stop ALL minting. Users will be unable to mint.",
                      paused ? "unpause" : "pause",
                    )
                  }
                  loading={isMining}
                />
              </div>
              <Card title="Mint Price" sub={`Current: ${curPrice ? formatEther(curPrice) : "—"} ETH`}>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label text="New Price (ETH)" />
                    <input
                      className={`Inp ${fPrice && !isValidPrice(fPrice) ? "border-error" : ""}`}
                      value={fPrice}
                      onChange={e => setFPrice(e.target.value)}
                      type="number"
                      step="0.001"
                      min="0"
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => tx("setMintPrice", [parseEther(fPrice)])}
                    disabled={isMining || !isValidPrice(fPrice)}
                  >
                    {isMining ? <S /> : "Update"}
                  </button>
                </div>
              </Card>
              <Card title="Max Per Wallet" sub={`Current: ${curPerWallet?.toString() || "—"}`}>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label text="New Limit" />
                    <input
                      className={`Inp ${fPerWallet && (isNaN(Number(fPerWallet)) || Number(fPerWallet) < 0) ? "border-error" : ""}`}
                      value={fPerWallet}
                      onChange={e => setFPerWallet(e.target.value)}
                      type="number"
                      step="1"
                      min="0"
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => tx("setMaxPerWallet", [BigInt(fPerWallet)])}
                    disabled={isMining || isNaN(Number(fPerWallet)) || Number(fPerWallet) < 0}
                  >
                    {isMining ? <S /> : "Update"}
                  </button>
                </div>
              </Card>
              <Card title="Metadata URI">
                <div className="space-y-3">
                  <div>
                    <Label text="Base URI (ipfs://Qm.../)" />
                    <div className="join w-full">
                      <input
                        className="Inp join-item flex-1"
                        placeholder="ipfs://..."
                        value={fBaseURI}
                        onChange={e => setFBaseURI(e.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm join-item"
                        onClick={() => tx("setBaseURI", [fBaseURI])}
                        disabled={isMining || !fBaseURI}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label text="Pre-Reveal URI (placeholder)" />
                    <div className="join w-full">
                      <input
                        className="Inp join-item flex-1"
                        placeholder="ipfs://.../placeholder.json"
                        value={fPreURI}
                        onChange={e => setFPreURI(e.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm join-item"
                        onClick={() => tx("setPreRevealURI", [fPreURI])}
                        disabled={isMining || !fPreURI}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
              <Card title="Commit-Reveal" sub="Two-phase metadata reveal">
                <div className="space-y-3">
                  <div>
                    <Label text="Commit Hash (bytes32)" />
                    <div className="join w-full">
                      <input
                        className="Inp join-item flex-1 font-mono text-xs"
                        placeholder="0x..."
                        value={fCommit}
                        onChange={e => setFCommit(e.target.value)}
                      />
                      <button
                        className="btn btn-info btn-sm join-item"
                        onClick={() => tx("commitReveal", [fCommit])}
                        disabled={isMining || !fCommit}
                      >
                        Commit
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label text="Seed (bytes32)" />
                    <div className="join w-full">
                      <input
                        className="Inp join-item flex-1 font-mono text-xs"
                        placeholder="0x..."
                        value={fSeed}
                        onChange={e => setFSeed(e.target.value)}
                      />
                      <button
                        className="btn btn-warning btn-sm join-item"
                        onClick={() => tx("finalizeReveal", [fSeed])}
                        disabled={isMining || !fSeed}
                      >
                        Reveal
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === "auction" && (
            <Card title="Configure Dutch Auction" sub="Price decreases linearly from start to end over duration">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label text="Start Price (ETH)" />
                  <input
                    className="Inp"
                    value={fAStartP}
                    onChange={e => setFAStartP(e.target.value)}
                    type="number"
                    step="0.001"
                    min="0"
                  />
                </div>
                <div>
                  <Label text="End Price (ETH)" />
                  <input
                    className="Inp"
                    value={fAEndP}
                    onChange={e => setFAEndP(e.target.value)}
                    type="number"
                    step="0.001"
                    min="0"
                  />
                </div>
                <div>
                  <Label text="Start Time (Unix)" />
                  <input
                    className="Inp"
                    placeholder="1700000000"
                    value={fAStartT}
                    onChange={e => {
                      if (e.target.value === "" || /^\d+$/.test(e.target.value)) setFAStartT(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <Label text="Duration (seconds)" />
                  <input
                    className="Inp"
                    value={fADur}
                    onChange={e => setFADur(e.target.value)}
                    type="number"
                    step="1"
                    min="1"
                  />
                </div>
              </div>
              <button
                className="btn btn-warning w-full mt-4"
                onClick={() =>
                  tx("configureDutchAuction", [
                    parseEther(fAStartP),
                    parseEther(fAEndP),
                    BigInt(fAStartT),
                    BigInt(fADur),
                  ])
                }
                disabled={
                  isMining || !fAStartT || !isValidPrice(fAStartP) || !isValidPrice(fAEndP) || Number(fADur) <= 0
                }
              >
                {isMining ? <S /> : "Configure Auction"}
              </button>
            </Card>
          )}

          {tab === "whitelist" && (
            <div className="space-y-5">
              <Card title="Current Merkle Root">
                <div className="rounded-xl bg-base-200/50 p-3 font-mono text-xs break-all text-base-content/60">
                  {curRoot || "0x000...000"}
                </div>
              </Card>
              <WhitelistManager onSetRoot={(root: string) => tx("setAllowlistMerkleRoot", [root])} />
              <Card title="Manual Root Set" sub="Paste a pre-computed Merkle root directly">
                <div className="join w-full">
                  <input
                    className="Inp join-item flex-1 font-mono text-xs"
                    placeholder="0x..."
                    value={fRoot}
                    onChange={e => setFRoot(e.target.value)}
                  />
                  <button
                    className="btn btn-info btn-sm join-item"
                    onClick={() => tx("setAllowlistMerkleRoot", [fRoot])}
                    disabled={isMining || !fRoot}
                  >
                    {isMining ? <S /> : "Set"}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {tab === "royalty" && (
            <Card title="EIP-2981 Royalty" sub="Set the royalty receiver and percentage (BPS)">
              <div>
                <Label text="Receiver Address" />
                <input
                  className={`Inp ${fRoyAddr && !isValidAddress(fRoyAddr) ? "border-error" : ""}`}
                  placeholder="0x..."
                  value={fRoyAddr}
                  onChange={e => setFRoyAddr(e.target.value)}
                />
                {fRoyAddr && !isValidAddress(fRoyAddr) && (
                  <p className="text-xs text-error mt-1">Invalid Ethereum address</p>
                )}
              </div>
              <div>
                <Label text="BPS (500 = 5%, max 10000)" />
                <input
                  className={`Inp ${fRoyBps && !isValidBps(fRoyBps) ? "border-error" : ""}`}
                  value={fRoyBps}
                  onChange={e => setFRoyBps(e.target.value)}
                  type="number"
                  step="1"
                  min="0"
                  max="10000"
                />
                {fRoyBps && !isValidBps(fRoyBps) && <p className="text-xs text-error mt-1">Must be integer 0-10000</p>}
              </div>
              <button
                className="btn btn-primary w-full mt-2"
                onClick={() => tx("setDefaultRoyalty", [fRoyAddr, BigInt(fRoyBps)])}
                disabled={isMining || !fRoyAddr || !isValidAddress(fRoyAddr) || !isValidBps(fRoyBps)}
              >
                {isMining ? <S /> : "Set Royalty"}
              </button>
            </Card>
          )}

          {tab === "payout" && (
            <div className="space-y-5">
              {recipients && recipients.length > 0 && (
                <Card title="Current Payout Config">
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>BPS</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map((a: string, i: number) => (
                          <tr key={i}>
                            <td className="font-mono text-xs">
                              {a.slice(0, 8)}...{a.slice(-6)}
                            </td>
                            <td>{bpsArr?.[i]?.toString()}</td>
                            <td>{bpsArr ? (Number(bpsArr[i]) / 100).toFixed(2) : "—"}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
              <Card title="Set Payout Recipients" sub="BPS must sum to 10000">
                <div>
                  <Label text="Addresses (comma-separated)" />
                  <textarea
                    className="Inp h-20 font-mono text-xs resize-none"
                    placeholder="0xAddr1, 0xAddr2"
                    value={fPayAddrs}
                    onChange={e => setFPayAddrs(e.target.value)}
                  />
                </div>
                <div>
                  <Label text="BPS (comma-separated)" />
                  <input
                    className="Inp"
                    placeholder="7000, 3000"
                    value={fPayBps}
                    onChange={e => setFPayBps(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary w-full mt-2"
                  onClick={() => {
                    const a = fPayAddrs
                      .split(",")
                      .map(s => s.trim())
                      .filter(Boolean);
                    const b = fPayBps
                      .split(",")
                      .map(s => s.trim())
                      .filter(Boolean)
                      .map(s => BigInt(s));
                    tx("setPayoutRecipients", [a, b]);
                  }}
                  disabled={isMining || !fPayAddrs || !fPayBps}
                >
                  {isMining ? <S /> : "Set Recipients"}
                </button>
              </Card>
            </div>
          )}

          {tab === "signer" && (
            <div className="space-y-5">
              <Card title="Current Signer">
                <div className="rounded-xl bg-base-200/50 p-3 font-mono text-xs break-all text-base-content/60">
                  {curSigner || "0x000...000"}
                </div>
              </Card>
              <Card title="Set New Signer" sub="This address signs authorization messages">
                <div className="join w-full">
                  <input
                    className="Inp join-item flex-1"
                    placeholder="0x..."
                    value={fSigner}
                    onChange={e => setFSigner(e.target.value)}
                  />
                  <button
                    className="btn btn-accent btn-sm join-item"
                    onClick={() => tx("setTrustedSigner", [fSigner])}
                    disabled={isMining || !fSigner}
                  >
                    {isMining ? <S /> : "Set"}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {tab === "erc20" && (
            <div className="space-y-5">
              <Card title="Current Config">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-base-content/40">Token</span>
                    <span className="font-mono text-xs">{curToken || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/40">Price</span>
                    <span className="font-bold">{curTokenPrice ? formatEther(curTokenPrice) : "—"} tokens</span>
                  </div>
                </div>
              </Card>
              <Card title="Set ERC20 Token">
                <div>
                  <Label text="Token Address" />
                  <input className="Inp" placeholder="0x..." value={fToken} onChange={e => setFToken(e.target.value)} />
                </div>
                <div>
                  <Label text="Price per NFT (token units)" />
                  <input className="Inp" value={fTokenP} onChange={e => setFTokenP(e.target.value)} />
                </div>
                <button
                  className="btn btn-secondary w-full mt-2"
                  onClick={() => tx("setAcceptedToken", [fToken, parseEther(fTokenP)])}
                  disabled={isMining || !fToken}
                >
                  {isMining ? <S /> : "Set Token"}
                </button>
              </Card>
            </div>
          )}

          {tab === "withdraw" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card title="ETH to Owner" sub="Send all ETH to contract owner">
                <button
                  className="btn btn-primary w-full"
                  onClick={() =>
                    confirmTx(
                      "Withdraw All ETH",
                      "This will send the entire contract balance to the owner wallet. This action cannot be undone.",
                      "withdraw",
                    )
                  }
                  disabled={isMining}
                >
                  {isMining ? <S /> : "Withdraw ETH"}
                </button>
              </Card>
              <Card title="Split Withdrawal" sub="Distribute ETH by BPS ratio">
                <button
                  className="btn btn-warning w-full"
                  onClick={() =>
                    confirmTx(
                      "Split Withdrawal",
                      "This will distribute all ETH to configured recipients by BPS ratio. This action cannot be undone.",
                      "withdrawSplit",
                    )
                  }
                  disabled={isMining}
                >
                  {isMining ? <S /> : "Withdraw Split"}
                </button>
              </Card>
            </div>
          )}
        </div>

        {isMining && (
          <div className="fixed bottom-20 right-4 z-50">
            <div className="rounded-2xl bg-info text-info-content px-4 py-3 shadow-2xl flex items-center gap-2 text-sm">
              <span className="loading loading-spinner loading-sm" />
              Processing...
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.desc}
        onConfirm={() => {
          setConfirm(c => ({ ...c, open: false }));
          confirm.action();
        }}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}

// ─── 子组件（无动态 Tailwind）───
function StatusRow({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText?: string;
  failText?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-base-content/40">{label}</span>
      {ok ? (
        <span className="badge badge-success badge-sm">{okText || "On"}</span>
      ) : (
        <span className="badge badge-error badge-sm">{failText || "Off"}</span>
      )}
    </div>
  );
}

function Toggle({
  label,
  active,
  okText,
  failText,
  onToggle,
  loading,
}: {
  label: string;
  active: boolean;
  okText?: string;
  failText?: string;
  onToggle: () => void;
  loading: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 ${active ? "border-success/20 bg-success/5" : "border-error/15 bg-error/5"}`}
    >
      <p className="text-xs text-base-content/40 mb-1">{label}</p>
      <p className={`text-xl font-black mb-3 ${active ? "text-success" : "text-error"}`}>
        {active ? okText || "Active" : failText || "Inactive"}
      </p>
      <button
        className={`btn btn-sm w-full ${active ? "btn-error" : "btn-success"}`}
        onClick={onToggle}
        disabled={loading}
      >
        {loading ? <S /> : active ? "Disable" : "Enable"}
      </button>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-base-content/5 bg-base-100 p-5">
      <h3 className="font-bold">{title}</h3>
      {sub && <p className="text-xs text-base-content/30 mb-3">{sub}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <label className="text-xs font-semibold text-base-content/50 mb-1 block">{text}</label>;
}
function S() {
  return <span className="loading loading-spinner loading-xs" />;
}
