"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { NFTMintUI } from "~~/components/NFTMintUI";
import scaffoldConfig from "~~/scaffold.config";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-alchemy/networks";

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
  const [error, setError] = useState<string | null>(null);
  const chainId = scaffoldConfig.targetNetworks[0].id;

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/collections/${params.id}`);
        if (res.ok) {
          setCollection(await res.json());
        } else if (res.status === 404) {
          // collection stays null → "Not Found" UI
        } else {
          setError("Failed to load collection. Please try again.");
        }
      } catch {
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
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

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
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
          <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
          <p className="text-base-content/50 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
            <Link href="/collections" className="btn btn-ghost">
              Back to Collections
            </Link>
          </div>
        </div>
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
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-4xl sm:text-5xl font-bold text-primary/30 overflow-hidden shrink-0">
              {collection.coverImage ? (
                <img src={collection.coverImage} alt={collection.name} className="w-full h-full object-cover" />
              ) : (
                collection.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold">{collection.name}</h1>
              <p className="text-base-content/60 mt-1">{collection.symbol}</p>
              {collection.description && <p className="mt-2">{collection.description}</p>}
              <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 text-sm">
                <span className={`badge ${collection.status === "active" ? "badge-success" : "badge-info"}`}>
                  {collection.status}
                </span>
                <span>Supply: {collection.maxSupply}</span>
                <span>Price: {Number(BigInt(collection.mintPrice) / 10n ** 16n) / 100} ETH</span>
                <span>Per Wallet: {collection.maxPerWallet}</span>
              </div>
              {collection.contractAddress && (
                <p className="text-xs text-base-content/40 mt-2 font-mono truncate">
                  Contract: {collection.contractAddress}
                </p>
              )}
            </div>
            {isOwner && (
              <Link href="/admin" className="btn btn-outline btn-sm shrink-0">
                Manage
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats shadow w-full mb-8 overflow-x-auto">
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
                        <div className="min-w-0">
                          <p className="font-mono text-sm truncate">
                            {mint.minterAddress.slice(0, 6)}...{mint.minterAddress.slice(-4)}
                          </p>
                          <p className="text-xs text-base-content/40">
                            {mint.quantity} NFT · {mint.mintMode}
                          </p>
                        </div>
                        <a
                          href={getBlockExplorerTxLink(chainId, mint.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary text-xs shrink-0 ml-2"
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
