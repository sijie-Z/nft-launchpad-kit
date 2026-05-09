"use client";

import { useMemo } from "react";
import { formatEther } from "viem";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-alchemy";

/**
 * 管理后台仪表盘 — 关键指标 + 铸造分析
 */
export function AdminDashboard() {
  const { data: minted } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "_tokenIdTracker",
  });
  const { data: supply } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "maxSupply",
  });
  const { data: price } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "mintPrice",
  });
  const { data: saleOn } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "saleIsActive",
  });
  const { data: allowOn } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "allowlistSaleIsActive",
  });
  const { data: paused } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "paused",
  });
  const { data: signer } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "trustedSigner",
  });

  // Fetch Transfer events for analytics
  const { data: transferEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "Transfer",
    fromBlock: 0n,
    watch: true,
  });

  const zero = "0x0000000000000000000000000000000000000000";
  const nMinted = minted ? Number(minted) : 0;
  const nSupply = supply ? Number(supply) : 0;
  const pct = nSupply > 0 ? Math.round((nMinted / nSupply) * 100) : 0;
  const revenue = price && nMinted ? formatEther(price * BigInt(nMinted)) : "0";

  // Analytics from events
  const analytics = useMemo(() => {
    if (!transferEvents?.length) return { uniqueMinters: 0, recentMints: 0, avgBlockSize: 0 };
    const mints = transferEvents.filter(e => e.args.from?.toLowerCase() === zero);
    const uniqueAddresses = new Set(mints.map(e => (e.args.to as string)?.toLowerCase()));
    // Mints in last 100 blocks (approximate recent activity)
    const recentThreshold = mints.length > 0 ? (mints[mints.length - 1].blockData?.number ?? 0n) - 100n : 0n;
    const recentMints = mints.filter(e => (e.blockData?.number ?? 0n) >= recentThreshold).length;
    return {
      uniqueMinters: uniqueAddresses.size,
      recentMints,
      avgBlockSize: mints.length > 0 ? Math.round(nMinted / Math.max(1, uniqueAddresses.size)) : 0,
    };
  }, [transferEvents, nMinted]);

  const metrics = [
    {
      label: "Total Minted",
      value: `${nMinted} / ${nSupply || "—"}`,
      sub: `${pct}% of supply`,
      color: "text-primary",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Est. Revenue",
      value: `${Number(revenue).toFixed(4)} ETH`,
      sub: `~$${(Number(revenue) * 2000).toFixed(0)} USD (approx)`,
      color: "text-success",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Unique Minters",
      value: analytics.uniqueMinters.toString(),
      sub: `~${analytics.avgBlockSize} per minter`,
      color: "text-info",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Status",
      value: paused ? "Paused" : saleOn ? "Live" : allowOn ? "Allowlist" : "Inactive",
      sub: signer && signer !== zero ? "Signer set" : "No signer",
      color: paused ? "text-error" : saleOn ? "text-success" : "text-warning",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {metrics.map(m => (
        <div key={m.label} className="rounded-xl border border-base-content/5 bg-base-200/30 p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base-content/30">{m.icon}</span>
            <span className="text-[10px] text-base-content/30 uppercase tracking-wider">{m.label}</span>
          </div>
          <span className={`text-lg font-bold ${m.color}`}>{m.value}</span>
          {m.sub && <span className="text-[10px] text-base-content/30 mt-0.5">{m.sub}</span>}
        </div>
      ))}
    </div>
  );
}
