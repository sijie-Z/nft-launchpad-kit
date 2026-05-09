"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { NFTMintUI } from "~~/components/NFTMintUI";

interface CollectionDetail {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  coverImage: string | null;
  contractAddress: string | null;
  maxSupply: number;
  mintPrice: string;
  maxPerWallet: number;
  status: string;
  baseURI: string | null;
  owner: { address: string };
  mintRecords: Array<{
    id: string;
    txHash: string;
    minterAddress: string;
    quantity: number;
    mintMode: string;
    createdAt: string;
  }>;
  claimPhases: Array<{
    phaseId: number;
    startTimestamp: string;
    maxSupply: number;
    quantityLimitPerWallet: number;
    pricePerToken: string;
  }>;
  _count: { mintRecords: number; whitelistEntries: number };
}

export default function CollectionDetailPage() {
  const params = useParams();
  const { address } = useAccount();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      const res = await fetch(`/api/collections/${params.id}`);
      if (res.ok) {
        setCollection(await res.json());
      }
      setLoading(false);
    };
    fetchCollection();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
          <Link href="/collections" className="btn btn-primary">
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = address && collection.owner.address.toLowerCase() === address.toLowerCase();

  return (
    <div className="min-h-screen bg-base-200 py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/collections" className="btn btn-ghost btn-sm mb-4">
            ← Back
          </Link>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-5xl font-bold text-primary/30 overflow-hidden">
              {collection.coverImage ? (
                <img src={collection.coverImage} alt={collection.name} className="w-full h-full object-cover" />
              ) : (
                collection.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              <p className="text-base-content/60 mt-1">{collection.symbol}</p>
              {collection.description && <p className="mt-2">{collection.description}</p>}
              <div className="flex gap-4 mt-3 text-sm">
                <span className={`badge ${collection.status === "active" ? "badge-success" : "badge-info"}`}>
                  {collection.status}
                </span>
                <span>Supply: {collection.maxSupply}</span>
                <span>Price: {Number(BigInt(collection.mintPrice) / 10n ** 16n) / 100} ETH</span>
                <span>Per Wallet: {collection.maxPerWallet}</span>
              </div>
              {collection.contractAddress && (
                <p className="text-xs text-base-content/40 mt-2 font-mono">
                  Contract: {collection.contractAddress}
                </p>
              )}
            </div>
            {isOwner && (
              <Link href="/admin" className="btn btn-outline btn-sm">
                Manage
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats shadow w-full mb-8">
          <div className="stat">
            <div className="stat-title">Total Mints</div>
            <div className="stat-value">{collection._count.mintRecords}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Whitelist Size</div>
            <div className="stat-value">{collection._count.whitelistEntries}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Claim Phases</div>
            <div className="stat-value">{collection.claimPhases.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mint UI */}
          <div>
            <h2 className="text-xl font-bold mb-4">Mint</h2>
            {collection.contractAddress ? (
              <NFTMintUI />
            ) : (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body text-center">
                  <p className="text-base-content/50">Contract not deployed yet</p>
                  {isOwner && (
                    <Link href="/admin" className="btn btn-primary btn-sm mt-2">
                      Deploy Now
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recent Mints */}
          <div>
            <h2 className="text-xl font-bold mb-4">Recent Mints</h2>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                {collection.mintRecords.length === 0 ? (
                  <p className="text-center text-base-content/50">No mints yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {collection.mintRecords.map(mint => (
                      <div key={mint.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div>
                          <p className="font-mono text-sm">
                            {mint.minterAddress.slice(0, 6)}...{mint.minterAddress.slice(-4)}
                          </p>
                          <p className="text-xs text-base-content/40">
                            {mint.quantity} NFT · {mint.mintMode}
                          </p>
                        </div>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${mint.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary text-xs"
                        >
                          Tx ↗
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
