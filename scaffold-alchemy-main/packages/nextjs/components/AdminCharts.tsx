"use client";

import { useMemo, useState } from "react";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-alchemy";

const zero = "0x0000000000000000000000000000000000000000";

// Pure CSS bar chart component
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-base-content/50">{d.value}</span>
          <div
            className="w-full bg-indigo-500/80 rounded-t-sm min-h-[2px] transition-all duration-300"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="text-[8px] text-base-content/40 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Pure CSS donut chart
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0)
    return (
      <div className="text-center text-base-content/40 text-sm" role="status">
        No data
      </div>
    );

  let cumulative = 0;
  const segments = data.map(d => {
    const start = cumulative;
    const pct = (d.value / total) * 100;
    cumulative += pct;
    return { ...d, start, pct };
  });

  // Build conic-gradient
  const gradient = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(", ");

  return (
    <div
      className="flex items-center gap-4"
      role="img"
      aria-label={`Donut chart: ${segments.map(s => `${s.label} ${s.value}`).join(", ")}`}
    >
      <div className="w-32 h-32 rounded-full relative shrink-0" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-4 bg-base-100 rounded-full flex items-center justify-center">
          <span className="text-lg font-bold">{total}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-base-content/70">{s.label}</span>
            <span className="font-mono text-base-content/50 ml-auto">
              {s.value} ({s.pct.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// CSS line chart (sparkline-style)
let lineChartIdCounter = 0;
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const [gradId] = useState(() => `lineGrad-${++lineChartIdCounter}`);
  if (data.length < 2) return <div className="text-center text-base-content/40 text-sm">Need 2+ data points</div>;

  const max = Math.max(...data.map(d => d.value), 1);
  const width = 100;
  const height = 100;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (d.value / max) * height,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div role="img" aria-label={`Line chart showing cumulative mints over ${data.length} days`}>
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#22c55e" />
        ))}
        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={(i / (data.length - 1)) * width}
            y={height + 14}
            textAnchor="middle"
            fontSize="6"
            fill="oklch(var(--bc) / 0.4)"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function AdminCharts() {
  const { data: transferEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "Transfer",
    fromBlock: 0n,
    watch: true,
  });

  const { data: signatureEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "MintedBySignature",
    fromBlock: 0n,
    watch: true,
  });

  const { data: allowlistEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "MintedByAllowlist",
    fromBlock: 0n,
    watch: true,
  });

  const { data: auctionEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "MintedByAuction",
    fromBlock: 0n,
    watch: true,
  });

  const { data: erc20Events } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "MintedByERC20",
    fromBlock: 0n,
    watch: true,
  });

  const { data: claimEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "Claimed",
    fromBlock: 0n,
    watch: true,
  });

  // Daily mints
  const dailyMints = useMemo(() => {
    if (!transferEvents?.length) return [];
    const mints = transferEvents.filter(e => e.args.from?.toLowerCase() === zero);
    const byDay = new Map<string, number>();
    mints.forEach(e => {
      const ts = Number(e.blockData?.timestamp ?? 0n);
      if (!ts) return;
      const day = new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byDay.set(day, (byDay.get(day) || 0) + 1);
    });
    return Array.from(byDay.entries())
      .slice(-14)
      .map(([label, value]) => ({ label, value }));
  }, [transferEvents]);

  // Mint mode distribution
  const modeDistribution = useMemo(() => {
    const modes: { label: string; value: number; color: string }[] = [];
    if (allowlistEvents?.length) modes.push({ label: "Allowlist", value: allowlistEvents.length, color: "#22c55e" });
    if (auctionEvents?.length) modes.push({ label: "Dutch Auction", value: auctionEvents.length, color: "#f59e0b" });
    if (signatureEvents?.length) modes.push({ label: "Signature", value: signatureEvents.length, color: "#8b5cf6" });
    if (erc20Events?.length) modes.push({ label: "ERC20", value: erc20Events.length, color: "#06b6d4" });
    if (claimEvents?.length) modes.push({ label: "Claim", value: claimEvents.length, color: "#ec4899" });

    const totalMints = transferEvents?.filter(e => e.args.from?.toLowerCase() === zero).length || 0;
    const otherMints = modes.reduce((sum, m) => sum + m.value, 0);
    const publicMints = Math.max(0, totalMints - otherMints);
    if (publicMints > 0) modes.unshift({ label: "Public", value: publicMints, color: "#6366f1" });

    return modes;
  }, [transferEvents, signatureEvents, allowlistEvents, auctionEvents, erc20Events, claimEvents]);

  // Cumulative mints
  const cumulativeMints = useMemo(() => {
    if (!transferEvents?.length) return [];
    const mints = transferEvents.filter(e => e.args.from?.toLowerCase() === zero);
    let cumulative = 0;
    const byDay = new Map<string, number>();
    mints.forEach(e => {
      const ts = Number(e.blockData?.timestamp ?? 0n);
      if (!ts) return;
      cumulative += 1;
      const day = new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byDay.set(day, cumulative);
    });
    return Array.from(byDay.entries())
      .slice(-14)
      .map(([label, value]) => ({ label, value }));
  }, [transferEvents]);

  if (!transferEvents) {
    return (
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body text-center text-base-content/40">
          <span className="loading loading-spinner loading-sm" />
          <p className="mt-2 text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (transferEvents.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body text-center text-base-content/40">
          <p>No mint data yet — charts will appear after the first mint</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-sm">Daily Mints</h3>
          <BarChart data={dailyMints} />
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-sm">Mint Modes</h3>
          <DonutChart data={modeDistribution} />
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-sm">Cumulative Mints</h3>
          <LineChart data={cumulativeMints} />
        </div>
      </div>
    </div>
  );
}
