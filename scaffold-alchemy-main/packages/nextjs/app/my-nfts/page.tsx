"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { NFTTokenCard } from "~~/components/NFTTokenCard";
import scaffoldConfig from "~~/scaffold.config";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-alchemy/networks";

interface MintRecord {
  id: string;
  txHash: string;
  minterAddress: string;
  tokenId: number | null;
  quantity: number;
  totalPaid: string;
  mintMode: string;
  createdAt: string;
  collection: { name: string; contractAddress: string | null };
}

interface NFTEntry {
  key: string;
  contractAddress: string;
  tokenId: number;
  collectionName: string;
  mintMode: string;
  txHash: string;
  mintedAt: string;
  paid: string;
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [records, setRecords] = useState<MintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"gallery" | "history">("gallery");
  const chainId = scaffoldConfig.targetNetworks[0].id;

  useEffect(() => {
    if (!address) return;
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mint-records?minter=${address}`);
        const data = await res.json();
        setRecords(data.records || []);
      } catch {
        setError("Failed to load your NFTs. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [address]);

  // Build individual NFT entries from records (expand quantity > 1)
  const nfts = useMemo(() => {
    const entries: NFTEntry[] = [];
    for (const r of records) {
      if (!r.collection.contractAddress) continue;
      const startId = r.tokenId ?? 0;
      for (let i = 0; i < r.quantity; i++) {
        entries.push({
          key: `${r.id}-${i}`,
          contractAddress: r.collection.contractAddress,
          tokenId: startId + i,
          collectionName: r.collection.name,
          mintMode: r.mintMode,
          txHash: r.txHash,
          mintedAt: r.createdAt,
          paid: r.totalPaid,
        });
      }
    }
    return entries;
  }, [records]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">My NFTs</h1>
          <p className="text-base-content/50 mb-6">Connect your wallet to view your NFT collection</p>
          <Link href="/" className="btn btn-primary">
            Browse Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My NFTs</h1>
            <p className="text-sm text-base-content/50 font-mono mt-1 break-all">{address}</p>
          </div>
          <div className="join">
            <button
              className={`btn btn-sm join-item ${view === "gallery" ? "btn-active" : ""}`}
              onClick={() => setView("gallery")}
            >
              Gallery
            </button>
            <button
              className={`btn btn-sm join-item ${view === "history" ? "btn-active" : ""}`}
              onClick={() => setView("history")}
            >
              History
            </button>
          </div>
        </div>

        {error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-xl text-base-content/50 mb-2">Something Went Wrong</p>
            <p className="text-sm text-base-content/30 mb-6">{error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : loading ? (
          view === "gallery" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card bg-base-100 shadow animate-pulse">
                  <div className="aspect-square bg-base-200" />
                  <div className="card-body p-4">
                    <div className="skeleton h-3 w-16 mb-2" />
                    <div className="skeleton h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card bg-base-100 shadow animate-pulse">
                  <div className="card-body h-24" />
                </div>
              ))}
            </div>
          )
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-base-content/5 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <p className="text-xl text-base-content/50 mb-2">No NFTs yet</p>
            <p className="text-sm text-base-content/30 mb-6">Mint your first NFT to see it here</p>
            <Link href="/" className="btn btn-primary">
              Start Minting
            </Link>
          </div>
        ) : view === "gallery" ? (
          /* Gallery view — NFT cards with images */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nfts.map(nft => (
              <NFTTokenCard
                key={nft.key}
                contractAddress={nft.contractAddress}
                tokenId={nft.tokenId}
                collectionName={nft.collectionName}
              />
            ))}
          </div>
        ) : (
          /* History view — mint records list */
          <div className="space-y-4">
            {records.map(record => (
              <div key={record.id} className="card bg-base-100 shadow-xl">
                <div className="card-body p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{record.collection.name}</h3>
                      <p className="text-sm text-base-content/60">
                        {record.quantity} NFT · {record.mintMode} · {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-sm">{Number(BigInt(record.totalPaid) / 10n ** 16n) / 100} ETH</p>
                      <a
                        href={getBlockExplorerTxLink(chainId, record.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary text-xs"
                      >
                        View Tx ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
