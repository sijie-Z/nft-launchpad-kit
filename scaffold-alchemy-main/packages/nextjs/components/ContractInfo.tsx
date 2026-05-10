"use client";

import * as chains from "viem/chains";
import { useChainId } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-alchemy";
import scaffoldConfig from "~~/scaffold.config";

/**
 * 合约信息面板
 * 显示合约地址、所有者、版本，含 Etherscan 链接
 */
export function ContractInfo() {
  const chainId = useChainId();
  const contractAddress: string | undefined = (deployedContracts as Record<number, any>)?.[chainId]?.NFTLaunchpadKit
    ?.address as string | undefined;
  const { data: owner } = useScaffoldReadContract({
    contractName: "NFTLaunchpadKit",
    functionName: "owner",
  });

  const isPlaceholder = !contractAddress || contractAddress === "0x0000000000000000000000000000000000000000";

  if (isPlaceholder) {
    return (
      <div className="w-full rounded-2xl border border-warning/20 bg-warning/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-xs font-semibold text-warning uppercase tracking-wider">Not Deployed</span>
        </div>
        <p className="text-sm text-base-content/50">
          Contract not deployed yet. Deploy and update the contract address.
        </p>
      </div>
    );
  }

  const shortAddr = `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}`;
  const explorerBase = Object.values(chains).find(c => c.id === chainId)?.blockExplorers?.default?.url ?? "";
  const etherscanUrl = explorerBase ? `${explorerBase}/address/${contractAddress}` : "";
  const shortOwner = owner ? `${owner.slice(0, 8)}...${owner.slice(-6)}` : "—";

  return (
    <div className="w-full rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Contract</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/40">Address</span>
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
          >
            {shortAddr}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/40">Owner</span>
          <span className="text-xs font-mono">{shortOwner}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/40">Network</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-xs">{scaffoldConfig.targetNetworks[0].name || "Unknown"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
