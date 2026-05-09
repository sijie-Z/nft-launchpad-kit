"use client";

import { useChainId } from "wagmi";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-alchemy";

/**
 * 交易状态指示器
 * 显示 pending / mining / confirmed / failed 状态
 */
export function TxStatus({
  status,
  hash,
}: {
  status: "idle" | "pending" | "mining" | "confirmed" | "failed";
  hash?: string | null;
}) {
  const chainId = useChainId();

  if (status === "idle") return null;

  const config = {
    pending: {
      color: "text-info",
      bg: "bg-info/10",
      border: "border-info/20",
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ),
      text: "Confirm in wallet...",
    },
    mining: {
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
      icon: <span className="loading loading-spinner loading-xs" />,
      text: "Mining transaction...",
    },
    confirmed: {
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      text: "Confirmed!",
    },
    failed: {
      color: "text-error",
      bg: "bg-error/10",
      border: "border-error/20",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      text: "Transaction failed",
    },
  };

  const c = config[status];
  const explorerUrl = hash ? getBlockExplorerTxLink(chainId, hash) : "";

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${c.bg} border ${c.border} ${c.color} text-xs`}>
      {c.icon}
      <span className="flex-1">{c.text}</span>
      {hash && (status === "mining" || status === "confirmed") && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono opacity-60 hover:opacity-100 underline-offset-2 hover:underline"
        >
          {hash.slice(0, 10)}...
        </a>
      )}
    </div>
  );
}
