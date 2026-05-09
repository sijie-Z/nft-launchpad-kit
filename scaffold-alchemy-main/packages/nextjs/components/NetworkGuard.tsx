"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const targetNetwork = scaffoldConfig.targetNetworks[0];
const targetChainId = targetNetwork.id;
const targetChainName = targetNetwork.name || "the correct network";

/**
 * 网络守卫 — 检测用户是否在正确网络上
 * 如果在错误网络，显示切换提示
 */
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return <>{children}</>;

  const isCorrectChain = chainId === targetChainId;

  if (isCorrectChain) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card bg-base-200 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="card-title text-xl">Wrong Network</h2>
            <p className="text-base-content/50 text-sm mt-1">
              Please switch to {targetChainName} to use this application.
            </p>
          </div>
          <div className="card-actions">
            <button
              className="btn btn-warning btn-wide"
              onClick={() => switchChain({ chainId: targetChainId })}
              disabled={isPending}
            >
              {isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Switch to {targetChainName}
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-base-content/20">Current network: Chain ID {chainId}</p>
        </div>
      </div>
    </div>
  );
}
