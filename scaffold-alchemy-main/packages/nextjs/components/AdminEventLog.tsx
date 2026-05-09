"use client";

import { useMemo, useState } from "react";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-alchemy";

type EventFilter = "all" | "mints" | "sales" | "prices";

/**
 * 管理后台事件日志 — 显示最近的合约事件，支持筛选
 */
export function AdminEventLog() {
  const [limit, setLimit] = useState(20);
  const [filter, setFilter] = useState<EventFilter>("all");

  const { data: saleEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "SaleStateChanged",
    fromBlock: 0n,
    watch: true,
    blockData: true,
  });

  const { data: priceEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "MintPriceUpdated",
    fromBlock: 0n,
    watch: true,
    blockData: true,
  });

  const { data: transferEvents } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "Transfer",
    fromBlock: 0n,
    watch: true,
    blockData: true,
  });

  const zero = "0x0000000000000000000000000000000000000000";
  const mints = useMemo(
    () => (transferEvents || []).filter(e => e.args.from?.toLowerCase() === zero),
    [transferEvents],
  );

  const stats = [
    { label: "Total Mints", value: mints.length, key: "mints" as EventFilter },
    { label: "Sale Toggles", value: saleEvents?.length || 0, key: "sales" as EventFilter },
    { label: "Price Changes", value: priceEvents?.length || 0, key: "prices" as EventFilter },
  ];

  // Unified event list with filtering
  const events = useMemo(() => {
    const all: { type: string; block: bigint; tx: string; detail: string }[] = [];

    if (filter === "all" || filter === "mints") {
      for (const e of mints) {
        const addr = (e.args.to as string) || "";
        const tokenId = e.args.tokenId?.toString() || "?";
        all.push({
          type: "mint",
          block: e.blockData?.number ?? 0n,
          tx: e.transactionHash || "",
          detail: `#${tokenId} → ${addr.slice(0, 6)}...${addr.slice(-4)}`,
        });
      }
    }

    if (filter === "all" || filter === "sales") {
      for (const e of saleEvents || []) {
        all.push({
          type: "sale",
          block: e.blockData?.number ?? 0n,
          tx: e.transactionHash || "",
          detail: `Sale ${e.args.isActive ? "ON" : "OFF"}`,
        });
      }
    }

    if (filter === "all" || filter === "prices") {
      for (const e of priceEvents || []) {
        all.push({
          type: "price",
          block: e.blockData?.number ?? 0n,
          tx: e.transactionHash || "",
          detail: `Price → ${e.args.newPrice ? (Number(e.args.newPrice) / 1e18).toFixed(4) : "?"} ETH`,
        });
      }
    }

    // Sort by block descending
    all.sort((a, b) => (b.block > a.block ? 1 : b.block < a.block ? -1 : 0));
    return all;
  }, [mints, saleEvents, priceEvents, filter]);

  const typeColors: Record<string, string> = {
    mint: "badge-primary",
    sale: "badge-warning",
    price: "badge-info",
  };

  return (
    <div className="rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Contract Activity</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {stats.map(s => (
          <button
            key={s.label}
            className={`text-center p-2 rounded-lg transition-colors cursor-pointer ${
              filter === s.key ? "bg-primary/10 border border-primary/20" : "bg-base-300/30 hover:bg-base-300/50"
            }`}
            onClick={() => setFilter(filter === s.key ? "all" : s.key)}
          >
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[10px] text-base-content/30">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(["all", "mints", "sales", "prices"] as EventFilter[]).map(f => (
          <button
            key={f}
            className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
              filter === f
                ? "bg-primary text-primary-content"
                : "bg-base-300/30 text-base-content/40 hover:text-base-content/60"
            }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {events.slice(0, limit).map(event => (
          <div
            key={`${event.tx}-${event.block.toString()}-${event.type}`}
            className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-base-300/30"
          >
            <div className="flex items-center gap-2">
              <span className={`badge badge-xs ${typeColors[event.type] || "badge-ghost"}`}>{event.type}</span>
              <span className="font-mono text-base-content/60">{event.detail}</span>
            </div>
            <span className="text-[10px] text-base-content/20">Block {event.block.toString()}</span>
          </div>
        ))}
        {events.length === 0 && <p className="text-xs text-base-content/20 text-center py-4">No events recorded yet</p>}
      </div>

      {events.length > limit && (
        <button
          className="w-full mt-2 text-xs text-primary/50 hover:text-primary py-1"
          onClick={() => setLimit(l => l + 20)}
        >
          Load more
        </button>
      )}
    </div>
  );
}
