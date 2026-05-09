"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  coverImage: string | null;
  contractAddress: string | null;
  maxSupply: number;
  mintPrice: string;
  status: string;
  owner: { address: string };
  _count: { mintRecords: number };
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/collections?${params}`);
      const data = await res.json();
      setCollections(data.collections || []);
      setLoading(false);
    };
    fetchCollections();
  }, [filter]);

  return (
    <div className="min-h-screen bg-base-200 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">NFT Collections</h1>
          <Link href="/admin" className="btn btn-primary btn-sm">
            Create Collection
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["", "active", "deployed", "draft"].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setFilter(s)}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
                <div className="h-48 bg-base-300 rounded-t-2xl" />
                <div className="card-body">
                  <div className="h-6 bg-base-300 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-base-300 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-base-content/50 mb-4">No collections yet</p>
            <Link href="/admin" className="btn btn-primary">
              Create Your First Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map(c => (
              <Link key={c.id} href={`/collections/${c.id}`}>
                <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
                    {c.coverImage ? (
                      <img src={c.coverImage} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-4xl font-bold text-primary/30">
                        {c.name.charAt(0)}
                      </div>
                    )}
                  </figure>
                  <div className="card-body">
                    <h2 className="card-title">
                      {c.name}
                      <span className={`badge badge-sm ${c.status === "active" ? "badge-success" : c.status === "deployed" ? "badge-info" : "badge-ghost"}`}>
                        {c.status}
                      </span>
                    </h2>
                    <p className="text-sm text-base-content/60">{c.symbol}</p>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Supply: {c.maxSupply}</span>
                      <span>Price: {Number(BigInt(c.mintPrice) / 10n ** 16n) / 100} ETH</span>
                    </div>
                    <div className="text-xs text-base-content/40 mt-1">
                      {c._count.mintRecords} mints · {c.owner.address.slice(0, 6)}...{c.owner.address.slice(-4)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
