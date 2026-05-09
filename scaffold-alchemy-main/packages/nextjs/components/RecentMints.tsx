"use client";

import { useState } from "react";
import * as chains from "viem/chains";
import { useChainId } from "wagmi";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-alchemy";

/**
 * 实时铸造活动流
 * 显示最近的 Transfer 事件（铸造 = from 是 zero address）
 */
export function RecentMints() {
  const chainId = useChainId();
  const explorerBase = Object.values(chains).find(c => c.id === chainId)?.blockExplorers?.default?.url ?? "";
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "NFTLaunchpadKit",
    eventName: "Transfer",
    fromBlock: 0n,
    watch: true,
    blockData: true,
    transactionData: true,
  });

  const [visible, setVisible] = useState(8);

  // 只显示铸造事件（from == zero address）
  const zero = "0x0000000000000000000000000000000000000000";
  const mintEvents = (events || []).filter(e => e.args.from?.toLowerCase() === zero).slice(0, visible);

  if (isLoading) {
    return (
      <div className="w-full rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded bg-base-300 animate-pulse" />
          <div className="w-24 h-3 rounded bg-base-300 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded-lg bg-base-300/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (mintEvents.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Recent Mints</span>
        </div>
        <p className="text-sm text-base-content/30 text-center py-4">No mints yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Recent Mints</span>
        </div>
        <span className="text-[10px] text-base-content/30">{mintEvents.length} shown</span>
      </div>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {mintEvents.map((event, i) => {
          const to = (event.args.to as string) || "";
          const tokenId = event.args.tokenId?.toString() || "?";
          const blockNum = event.blockData?.number?.toString() || "";
          const shortAddr = to ? `${to.slice(0, 6)}...${to.slice(-4)}` : "unknown";

          return (
            <div
              key={`${event.transactionHash}-${i}`}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-base-300/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {tokenId}
                </div>
                <div>
                  <p className="text-xs font-mono">{shortAddr}</p>
                  <p className="text-[10px] text-base-content/30">Block #{blockNum}</p>
                </div>
              </div>
              {event.transactionHash && explorerBase && (
                <a
                  href={`${explorerBase}/tx/${event.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-primary/60 hover:text-primary font-mono"
                >
                  tx ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
      {events && events.filter(e => e.args.from?.toLowerCase() === zero).length > visible && (
        <button
          className="w-full mt-2 text-xs text-primary/60 hover:text-primary py-1.5 transition-colors"
          onClick={() => setVisible(v => v + 8)}
        >
          Show more
        </button>
      )}
    </div>
  );
}
