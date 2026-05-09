"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { GasEstimate } from "~~/components/GasEstimate";
import { MintSuccess } from "~~/components/MintSuccess";
import { TxStatus } from "~~/components/TxStatus";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-alchemy";
import { mapContractError } from "~~/utils/errorMap";
import { notification } from "~~/utils/scaffold-alchemy";

type MintMode = "public" | "allowlist" | "auction" | "signature" | "erc20";

// ─── 颜色映射（Tailwind 静态分析需要完整类名）───
const MODE_COLORS: Record<
  MintMode,
  { bg: string; bgActive: string; text: string; btn: string; badge: string; border: string }
> = {
  public: {
    bg: "bg-primary/10",
    bgActive: "bg-primary text-primary-content",
    text: "text-primary",
    btn: "btn-primary",
    badge: "badge-primary",
    border: "border-primary/20",
  },
  allowlist: {
    bg: "bg-info/10",
    bgActive: "bg-info text-info-content",
    text: "text-info",
    btn: "btn-info",
    badge: "badge-info",
    border: "border-info/20",
  },
  auction: {
    bg: "bg-warning/10",
    bgActive: "bg-warning text-warning-content",
    text: "text-warning",
    btn: "btn-warning",
    badge: "badge-warning",
    border: "border-warning/20",
  },
  signature: {
    bg: "bg-accent/10",
    bgActive: "bg-accent text-accent-content",
    text: "text-accent",
    btn: "btn-accent",
    badge: "badge-accent",
    border: "border-accent/20",
  },
  erc20: {
    bg: "bg-secondary/10",
    bgActive: "bg-secondary text-secondary-content",
    text: "text-secondary",
    btn: "btn-secondary",
    badge: "badge-secondary",
    border: "border-secondary/20",
  },
};

// ─── 倒计时 ───
function useCountdown(target: bigint | undefined, duration: bigint | undefined) {
  const [state, setState] = useState({ text: "", progress: 0, active: false });
  useEffect(() => {
    if (!target || !duration || target === 0n) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const start = Number(target);
      const end = start + Number(duration);
      if (now < start) {
        const d = start - now;
        setState({ text: `Starts in ${fmtTime(d)}`, progress: 0, active: false });
      } else if (now >= end) {
        setState({ text: "Ended", progress: 100, active: false });
      } else {
        const elapsed = now - start;
        const total = Number(duration);
        setState({ text: `Ends in ${fmtTime(total - elapsed)}`, progress: (elapsed / total) * 100, active: true });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, duration]);
  return state;
}

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── 进度环 ───
function Ring({ pct, size = 130 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90 drop-shadow-lg">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(var(--b3))" strokeWidth="8" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="oklch(var(--p))"
        strokeWidth="8"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

// ─── 主组件 ───
export const NFTMintUI = () => {
  const { address } = useAccount();
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<MintMode>("public");
  const [proof, setProof] = useState("");
  const [sigQty, setSigQty] = useState(1);
  const [sigMax, setSigMax] = useState(5);
  const [sigDeadline, setSigDeadline] = useState("");
  const [sigValue, setSigValue] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showOk, setShowOk] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "mining" | "confirmed" | "failed">("idle");

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "NFTLaunchpadKit" });

  const { data: price } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "mintPrice" });
  const { data: minted, refetch: refetchMinted } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "_tokenIdTracker",
  });
  const { data: supply } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "maxSupply" });
  const { data: perWallet } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "maxPerWallet",
  });
  const { data: saleOn } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "saleIsActive" });
  const { data: allowOn } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "allowlistSaleIsActive",
  });
  const { data: auctionSP } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "auctionStartPrice",
  });
  const { data: auctionEP } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "auctionEndPrice",
  });
  const { data: auctionST } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "auctionStartTime",
  });
  const { data: auctionDur } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "auctionDuration",
  });
  const { data: curAP, refetch: refetchAP } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "currentAuctionPrice",
  });
  const { data: erc20 } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "acceptedToken" });
  const { data: erc20Price } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "tokenMintPrice",
  });
  const { data: myMints } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "_walletMints",
    args: address ? [address] : undefined,
  });
  const { data: sigNonce } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "signatureNonce",
    args: address ? [address] : undefined,
  });
  const { data: paused } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "paused" });
  const { data: revealed } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "revealed" });
  const { data: signer } = useScaffoldReadContract({ contractName: "NFTLaunchpadKit", functionName: "trustedSigner" });
  const { data: merkle } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "allowlistMerkleRoot",
  });

  const auction = useCountdown(auctionST, auctionDur);

  useEffect(() => {
    const t = setInterval(() => refetchAP(), 5000);
    return () => clearInterval(t);
  }, [refetchAP]);

  // Sync isMining from hook to show mining status
  useEffect(() => {
    if (isMining) {
      setTxStatus("mining");
    }
  }, [isMining]);

  const nMinted = minted ? Number(minted) : 0;
  const nSupply = supply ? Number(supply) : 0;
  const pct = nSupply > 0 ? Math.round((nMinted / nSupply) * 100) : 0;

  const zero = "0x0000000000000000000000000000000000000000";
  const zeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const hasAuction = auctionST && auctionST > 0n;
  const hasAllow = merkle && merkle !== zeroBytes32;
  const hasSigner = signer && signer !== zero;
  const hasERC20 = erc20 && erc20 !== zero;

  const modes: { key: MintMode; label: string; ok: boolean }[] = [
    { key: "public", label: "Public", ok: !!saleOn },
    { key: "allowlist", label: "Allowlist", ok: !!allowOn && !!hasAllow },
    { key: "auction", label: "Auction", ok: !!hasAuction },
    { key: "signature", label: "Signature", ok: !!hasSigner },
    { key: "erc20", label: "ERC20", ok: !!hasERC20 && !!saleOn },
  ];

  const doTx = useCallback(
    async (fn: string, args: any[], value?: bigint) => {
      try {
        setTxStatus("pending");
        // writeContractAsync (via useTransactor) waits for the receipt internally
        const r = await writeContractAsync({ functionName: fn, args, ...(value !== undefined ? { value } : {}) });
        if (r) {
          setTxHash(r);
          setTxStatus("confirmed");
          setShowOk(true);
          refetchMinted();
          setTimeout(() => setTxStatus("idle"), 8000);
        }
      } catch (e: any) {
        setTxStatus("failed");
        setTxHash(null);
        notification.error(mapContractError(e));
        setTimeout(() => setTxStatus("idle"), 5000);
      }
    },
    [writeContractAsync, refetchMinted],
  );

  const mintPublic = () => price && doTx("mint", [BigInt(qty)], price * BigInt(qty));
  const mintAllow = () => {
    if (!price) return;
    const p = proof
      .split(",")
      .map(s => s.trim())
      .filter(s => s.startsWith("0x"));
    doTx("mintAllowlist", [BigInt(qty), p], price * BigInt(qty));
  };
  const mintAuction = () => curAP && doTx("mintDutchAuction", [BigInt(qty)], curAP * BigInt(qty));
  const mintSig = () =>
    price &&
    doTx(
      "mintWithSignature712",
      [BigInt(sigQty), BigInt(sigMax), BigInt(sigDeadline || "0"), sigNonce ?? 0n, sigValue],
      price * BigInt(sigQty),
    );
  const mintERC20 = () => saleOn && doTx("mintWithERC20", [BigInt(qty)]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto px-4">
      {/* ─── HERO ─── */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 border border-base-content/5">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
              <span className={`badge gap-1.5 ${paused ? "badge-error" : "badge-success"}`}>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-error-content" : "bg-success-content"} animate-pulse`}
                />
                {paused ? "Paused" : "Live"}
              </span>
              {revealed && <span className="badge badge-accent badge-sm">Revealed</span>}
              {saleOn && <span className="badge badge-primary badge-sm">Public Sale</span>}
              {allowOn && <span className="badge badge-info badge-sm">Allowlist</span>}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                NFT Launchpad
              </span>
            </h1>
            <p className="text-base-content/50 text-base mb-5 max-w-md">
              Mint your unique NFT with whitelist, Dutch auction, signature authorization, and ERC20 payment support.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-start text-sm">
              <Stat label="Price" value={price ? `${formatEther(price)} ETH` : "—"} />
              <Stat label="Per Wallet" value={perWallet?.toString() || "—"} />
              <Stat label="Your Mints" value={myMints?.toString() || "0"} />
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <Ring pct={pct} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tabular-nums">{nMinted}</span>
              <span className="text-[10px] text-base-content/30 uppercase tracking-widest">of {nSupply || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 拍卖条 ─── */}
      {hasAuction && (
        <div className="w-full rounded-2xl border border-warning/20 bg-warning/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-bold text-sm text-warning">Dutch Auction {auction.active && "— Live"}</span>
            </div>
            <span className="text-xs font-mono text-base-content/50">{auction.text}</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-1.5 mb-4 overflow-hidden">
            <div
              className="bg-warning h-full rounded-full transition-all duration-1000"
              style={{ width: `${auction.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-[10px] text-base-content/30 uppercase tracking-wider">Start</p>
              <p className="font-bold text-sm">{auctionSP ? formatEther(auctionSP) : "—"} ETH</p>
            </div>
            <div className="text-center px-6">
              <p className="text-[10px] text-base-content/30 uppercase tracking-wider">Current</p>
              <p className="text-3xl font-black text-warning tabular-nums">{curAP ? formatEther(curAP) : "—"} ETH</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-base-content/30 uppercase tracking-wider">Floor</p>
              <p className="font-bold text-sm">{auctionEP ? formatEther(auctionEP) : "—"} ETH</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 模式 Tab ─── */}
      <div className="w-full">
        <div className="tabs tabs-boxed bg-base-200/50 p-1.5 rounded-2xl">
          {modes.map(m => {
            const c = MODE_COLORS[m.key];
            return (
              <button
                key={m.key}
                className={`tab flex-1 rounded-xl text-sm font-semibold transition-all duration-200 ${mode === m.key ? c.bgActive + " shadow-md" : ""} ${!m.ok ? "opacity-30 cursor-not-allowed" : "hover:bg-base-300"}`}
                onClick={() => m.ok && setMode(m.key)}
                disabled={!m.ok}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 铸造面板 ─── */}
      <div className="w-full rounded-3xl border border-base-content/5 bg-base-100 shadow-xl">
        <div className="p-6 md:p-8 space-y-6">
          {/* Public */}
          {mode === "public" && (
            <>
              <Head
                title="Public Sale"
                icon="🏪"
                desc={saleOn ? "Mint at the listed price." : "Public sale is not active."}
              />
              {!saleOn && <Blocked msg="Public sale is not active." />}
              <Qty qty={qty} set={setQty} max={perWallet ? Number(perWallet) : undefined} />
              <Total price={price} qty={qty} />
              <GasEstimate gasLimit={150000n * BigInt(qty)} />
              <Go
                label="Mint Now"
                color={MODE_COLORS.public.btn}
                loading={isMining}
                disabled={isMining || !saleOn || !!paused || !address}
                onClick={mintPublic}
              />
            </>
          )}
          {/* Allowlist */}
          {mode === "allowlist" && (
            <>
              <Head title="Allowlist Mint" icon="📋" desc="Enter your Merkle proof to verify eligibility." />
              {!allowOn && <Blocked msg="Allowlist sale is not active." />}
              <Qty qty={qty} set={setQty} max={perWallet ? Number(perWallet) : undefined} />
              <div>
                <label className="text-xs font-semibold text-base-content/60 mb-1.5 block">Merkle Proof</label>
                <textarea
                  className="w-full rounded-xl border border-base-content/10 bg-base-200/30 p-3 font-mono text-xs h-24 focus:outline-none focus:border-info transition-colors resize-none"
                  placeholder="0xabc..., 0xdef... (comma-separated hex values)"
                  value={proof}
                  onChange={e => setProof(e.target.value)}
                  onBlur={() => {
                    // Validate: each segment must start with 0x
                    const cleaned = proof
                      .split(",")
                      .map(s => s.trim())
                      .filter(Boolean)
                      .map(s => (s.startsWith("0x") ? s : `0x${s}`))
                      .join(", ");
                    if (cleaned !== proof) setProof(cleaned);
                  }}
                />
              </div>
              <Total price={price} qty={qty} />
              <GasEstimate gasLimit={135000n * BigInt(qty)} />
              <Go
                label="Mint (Allowlist)"
                color={MODE_COLORS.allowlist.btn}
                loading={isMining}
                disabled={isMining || !allowOn || !!paused || !address || !proof}
                onClick={mintAllow}
              />
            </>
          )}
          {/* Auction */}
          {mode === "auction" && (
            <>
              <Head title="Dutch Auction" icon="📉" desc="Price decreases over time. Current price shown above." />
              <Qty qty={qty} set={setQty} max={perWallet ? Number(perWallet) : undefined} />
              <Total price={curAP} qty={qty} label="Current Price" highlight />
              <GasEstimate gasLimit={135000n * BigInt(qty)} />
              <Go
                label="Mint (Auction)"
                color={MODE_COLORS.auction.btn}
                loading={isMining}
                disabled={isMining || !!paused || !address || !curAP}
                onClick={mintAuction}
              />
            </>
          )}
          {/* Signature */}
          {mode === "signature" && (
            <>
              <Head title="Signature Mint" icon="✍️" desc="Use an authorization signature from the trusted signer." />
              {!hasSigner && <Blocked msg="No trusted signer configured." />}
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Quantity"
                  value={String(sigQty)}
                  onChange={v => {
                    const n = Math.floor(Number(v));
                    if (!isNaN(n) && n >= 1) setSigQty(n);
                  }}
                  onBlur={() => {
                    if (sigQty < 1) setSigQty(1);
                  }}
                  type="number"
                />
                <Field
                  label="Max Mint"
                  value={String(sigMax)}
                  onChange={v => {
                    const n = Math.floor(Number(v));
                    if (!isNaN(n) && n >= 1) setSigMax(n);
                  }}
                  onBlur={() => {
                    if (sigMax < 1) setSigMax(1);
                  }}
                  type="number"
                />
              </div>
              <Field
                label="Deadline (Unix timestamp)"
                value={sigDeadline}
                onChange={v => {
                  // Only allow digits
                  if (v === "" || /^\d+$/.test(v)) setSigDeadline(v);
                }}
                placeholder="1700000000"
              />
              <div>
                <label className="text-xs font-semibold text-base-content/60 mb-1.5 block">Signature</label>
                <textarea
                  className="w-full rounded-xl border border-base-content/10 bg-base-200/30 p-3 font-mono text-xs h-20 focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="0x..."
                  value={sigValue}
                  onChange={e => setSigValue(e.target.value)}
                />
              </div>
              <Total price={price} qty={sigQty} />
              <GasEstimate gasLimit={160000n * BigInt(sigQty)} />
              <Go
                label="Mint (Signature)"
                color={MODE_COLORS.signature.btn}
                loading={isMining}
                disabled={isMining || !!paused || !address || !sigValue || !sigDeadline}
                onClick={mintSig}
              />
            </>
          )}
          {/* ERC20 */}
          {mode === "erc20" && (
            <>
              <Head title="ERC20 Token Mint" icon="🪙" desc="Pay with ERC20 tokens instead of ETH." />
              {hasERC20 ? (
                <>
                  <div className="rounded-xl bg-base-200/30 border border-base-content/5 p-4 text-sm space-y-1.5">
                    <Row label="Token" value={<span className="font-mono text-xs">{erc20}</span>} />
                    <Row
                      label="Price"
                      value={<span className="font-bold">{erc20Price ? formatEther(erc20Price) : "—"} tokens</span>}
                    />
                  </div>
                  <Qty qty={qty} set={setQty} max={perWallet ? Number(perWallet) : undefined} />
                  <Total price={erc20Price} qty={qty} symbol="tokens" />
                  <GasEstimate gasLimit={200000n * BigInt(qty)} />
                  <Go
                    label="Mint with ERC20"
                    color={MODE_COLORS.erc20.btn}
                    loading={isMining}
                    disabled={isMining || !saleOn || !!paused || !address}
                    onClick={mintERC20}
                  />
                </>
              ) : (
                <Blocked msg="No ERC20 token configured." />
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── 交易状态 ─── */}
      {txStatus !== "idle" && (
        <div className="w-full">
          <TxStatus status={txStatus} hash={txHash} />
        </div>
      )}

      {/* ─── 连接提示 ─── */}
      {!address && (
        <div className="w-full rounded-2xl border border-info/20 bg-info/5 p-4 flex items-center gap-3 text-sm text-base-content/60">
          <svg className="w-5 h-5 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Connect your wallet using the button in the top right to start minting.
        </div>
      )}

      {/* ─── 成功弹窗 ─── */}
      <MintSuccess txHash={showOk ? txHash : null} onClose={() => setShowOk(false)} />
    </div>
  );
};

// ─── 子组件 ───
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-base-content/30 text-xs">{label}</span>
      <span className="ml-1.5 font-bold text-sm">{value}</span>
    </div>
  );
}

function Head({ title, icon, desc }: { title: string; icon: string; desc: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      <p className="text-sm text-base-content/40 mt-0.5">{desc}</p>
    </div>
  );
}

function Blocked({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl bg-base-200/50 border border-base-content/5 p-4 text-sm text-base-content/30 flex items-center gap-2">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
      {msg}
    </div>
  );
}

function Qty({ qty, set, max }: { qty: number; set: (n: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="w-10 h-10 rounded-xl border border-base-content/10 flex items-center justify-center text-lg font-bold hover:bg-base-200 transition-colors"
        onClick={() => set(Math.max(1, qty - 1))}
      >
        −
      </button>
      <input
        type="number"
        step={1}
        className="w-20 h-10 rounded-xl border border-base-content/10 bg-base-200/30 text-center text-lg font-bold focus:outline-none focus:border-primary transition-colors"
        value={qty}
        onChange={e => {
          const raw = e.target.value;
          if (raw === "") return; // allow clearing
          const v = Math.floor(Number(raw));
          if (isNaN(v) || v < 1) return;
          set(max ? Math.min(max, v) : v);
        }}
        onBlur={e => {
          const raw = e.target.value;
          if (!raw || Number(raw) < 1) set(1);
        }}
        min={1}
        max={max}
      />
      <button
        type="button"
        className="w-10 h-10 rounded-xl border border-base-content/10 flex items-center justify-center text-lg font-bold hover:bg-base-200 transition-colors"
        onClick={() => set(max ? Math.min(max, qty + 1) : qty + 1)}
      >
        +
      </button>
      {max !== undefined && <span className="text-xs text-base-content/20">max {max}</span>}
    </div>
  );
}

function Total({
  price,
  qty,
  label,
  highlight,
  symbol,
}: {
  price?: bigint;
  qty: number;
  label?: string;
  highlight?: boolean;
  symbol?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl p-4 ${highlight ? "bg-warning/5 border border-warning/15" : "bg-base-200/30 border border-base-content/5"}`}
    >
      <span className="text-sm text-base-content/40">{label || "Total"}</span>
      <span className={`text-xl font-black tabular-nums ${highlight ? "text-warning" : ""}`}>
        {price ? formatEther(price * BigInt(qty)) : "—"} {symbol || "ETH"}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-base-content/40">{label}</span>
      {value}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-base-content/60 mb-1.5 block">{label}</label>
      <input
        type={type || "text"}
        className="w-full rounded-xl border border-base-content/10 bg-base-200/30 px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        step={type === "number" ? 1 : undefined}
      />
    </div>
  );
}

function Go({
  label,
  color,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  color: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full h-14 rounded-2xl font-bold text-lg transition-all duration-200 ${color} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl"}`}
      onClick={onClick}
      disabled={disabled}
    >
      {loading ? <span className="loading loading-spinner loading-md" /> : label}
    </button>
  );
}
