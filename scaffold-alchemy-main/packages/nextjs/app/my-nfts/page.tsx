"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

interface MintRecord {
  id: string;
  txHash: string;
  minterAddress: string;
  quantity: number;
  totalPaid: string;
  mintMode: string;
  createdAt: string;
  collection: { name: string; contractAddress: string | null };
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [records, setRecords] = useState<MintRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    const fetchRecords = async () => {
      setLoading(true);
      const res = await fetch(`/api/mint-records?minter=${address}`);
      const data = await res.json();
      setRecords(data.records || []);
      setLoading(false);
    };
    fetchRecords();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">My NFTs</h1>
          <p className="text-base-content/50 mb-4">Connect your wallet to view your NFTs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My NFTs</h1>

        <div className="mb-6">
          <p className="text-sm text-base-content/60 font-mono">{address}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card bg-base-100 shadow animate-pulse">
                <div className="card-body h-24" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-base-content/50 mb-4">No NFTs minted yet</p>
            <Link href="/collections" className="btn btn-primary">
              Browse Collections
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(record => (
              <div key={record.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="card-title text-lg">{record.collection.name}</h3>
                      <p className="text-sm text-base-content/60">
                        {record.quantity} NFT · {record.mintMode} ·{" "}
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {Number(BigInt(record.totalPaid) / 10n ** 16n) / 100} ETH
                      </p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary text-xs"
                      >
                        View on Etherscan ↗
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
