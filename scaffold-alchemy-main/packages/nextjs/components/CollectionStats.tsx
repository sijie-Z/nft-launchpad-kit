"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-alchemy";

/**
 * 集合元数据展示栏
 * 显示合约标准、版税、链、供应量等关键信息
 */
export function CollectionStats() {
  const { data: supply } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "maxSupply",
  });
  const { data: price } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "mintPrice",
  });
  const { data: perWallet } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "maxPerWallet",
  });
  const { data: minted } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "_tokenIdTracker",
  });

  const items = [
    { label: "Standard", value: "ERC-721" },
    { label: "Chain", value: "Sepolia" },
    { label: "Supply", value: supply?.toString() || "—" },
    { label: "Minted", value: minted?.toString() || "0" },
    { label: "Price", value: price ? `${formatEther(price)} ETH` : "—" },
    { label: "Limit", value: perWallet ? `${perWallet}/wallet` : "—" },
    { label: "Royalty", value: "5%" },
    { label: "Status", value: "Live" },
  ];

  return (
    <div className="w-full rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Collection Info</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.label} className="flex flex-col">
            <span className="text-[10px] text-base-content/30 uppercase tracking-wider">{item.label}</span>
            <span className="text-sm font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
