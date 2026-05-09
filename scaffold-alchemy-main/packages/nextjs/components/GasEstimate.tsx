"use client";

import { formatEther } from "viem";
import { useGasPrice } from "wagmi";

/**
 * Gas 估算显示
 * 显示预估 Gas 费用（基于当前 Gas Price）
 */
export function GasEstimate({ gasLimit }: { gasLimit?: bigint }) {
  const { data: gasPrice } = useGasPrice();

  if (!gasPrice || !gasLimit) return null;

  const gasCost = gasPrice * gasLimit;
  const ethCost = formatEther(gasCost);

  return (
    <div className="flex items-center justify-between text-xs text-base-content/30 px-1">
      <span>Est. Gas Fee</span>
      <span className="font-mono">~{Number(ethCost).toFixed(6)} ETH</span>
    </div>
  );
}
