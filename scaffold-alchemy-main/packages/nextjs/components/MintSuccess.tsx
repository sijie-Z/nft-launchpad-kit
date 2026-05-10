"use client";

import { useEffect, useState } from "react";
import { useChainId } from "wagmi";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-alchemy";

interface MintSuccessProps {
  txHash: string | null;
  collectionName?: string;
  onClose: () => void;
}

export function MintSuccess({ txHash, collectionName, onClose }: MintSuccessProps) {
  const chainId = useChainId();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (txHash) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onClose();
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [txHash, onClose]);

  if (!show || !txHash) return null;

  const shortTx = txHash.length > 18 ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : txHash;
  const explorerUrl = getBlockExplorerTxLink(chainId, txHash);
  const shareText = collectionName
    ? `I just minted an NFT from ${collectionName}! 🚀`
    : "I just minted an NFT from NFT Launchpad Kit! 🚀";

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n\n${explorerUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(explorerUrl)}&text=${encodeURIComponent(shareText)}`;

  const copyTx = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = txHash;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            <p className="text-sm text-base-content/50">
              {collectionName ? `Your ${collectionName} NFT` : "Your NFT"} has been minted and added to your wallet.
            </p>
          </div>

          {/* Tx hash with copy */}
          <button
            onClick={copyTx}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-base-200/50 border border-base-content/5 hover:border-primary/20 transition-colors group cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-base-content/30 group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {copied ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              )}
            </svg>
            <span className="font-mono text-xs">{copied ? "Copied!" : shortTx}</span>
          </button>

          {/* Share buttons */}
          <div className="flex gap-2 w-full">
            <a href={tweetUrl} target="_blank" rel="noreferrer" className="btn btn-outline flex-1 gap-2 btn-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter
            </a>
            <a href={telegramUrl} target="_blank" rel="noreferrer" className="btn btn-outline flex-1 gap-2 btn-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </a>
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="btn btn-primary flex-1 btn-sm">
              Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
