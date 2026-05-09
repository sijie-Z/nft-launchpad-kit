"use client";

import { useEffect, useState } from "react";
import { useChainId } from "wagmi";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-alchemy";

interface MintSuccessProps {
  txHash: string | null;
  onClose: () => void;
}

/**
 * 铸造成功弹窗
 * 显示交易哈希、区块浏览器链接、分享到 Twitter 按钮
 */
export function MintSuccess({ txHash, onClose }: MintSuccessProps) {
  const chainId = useChainId();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (txHash) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onClose();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [txHash, onClose]);

  if (!show || !txHash) return null;

  const shortTx = txHash.length > 18 ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : txHash;
  const explorerUrl = getBlockExplorerTxLink(chainId, txHash);
  const tweetText = encodeURIComponent(`I just minted an NFT from NFT Launchpad Kit! 🚀\n\nTx: ${explorerUrl}`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          setShow(false);
          onClose();
        }}
      />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-[slideUp_0.3s_ease-out]">
        {/* Close */}
        <button
          className="absolute top-4 right-4 text-base-content/30 hover:text-base-content transition-colors"
          onClick={() => {
            setShow(false);
            onClose();
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* Success icon */}
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-1">Mint Successful!</h3>
            <p className="text-sm text-base-content/50">Your NFT has been minted and added to your wallet.</p>
          </div>

          {/* Tx hash */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-base-200/50 border border-base-content/5 hover:border-primary/20 transition-colors group"
          >
            <svg
              className="w-4 h-4 text-base-content/30 group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span className="font-mono text-xs">{shortTx}</span>
          </a>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <a href={tweetUrl} target="_blank" rel="noreferrer" className="btn btn-outline flex-1 gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share
            </a>
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="btn btn-primary flex-1">
              View on Etherscan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
