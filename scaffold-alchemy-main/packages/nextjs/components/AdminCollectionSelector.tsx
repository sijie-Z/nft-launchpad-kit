"use client";

import { useEffect, useState } from "react";

interface Collection {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string | null;
  maxSupply: number;
  mintPrice: string;
  status: string;
  _count: { mintRecords: number };
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  ownerAddress?: string;
}

export function AdminCollectionSelector({ selectedId, onSelect, ownerAddress }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (ownerAddress) params.set("owner", ownerAddress);
      params.set("limit", "50");
      const res = await fetch(`/api/collections?${params}`);
      const data = await res.json();
      setCollections(data.collections || []);
      setLoading(false);
    };
    fetchCollections();
  }, [ownerAddress]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-base-content/5 bg-base-100 p-4">
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="skeleton h-10 w-full" />
      </div>
    );
  }

  const selected = collections.find(c => c.id === selectedId);

  return (
    <div className="rounded-2xl border border-base-content/5 bg-base-100 p-4">
      <label className="text-xs font-semibold text-base-content/50 mb-2 block">Managing Collection</label>
      <select
        className="select select-bordered select-sm w-full"
        value={selectedId || ""}
        onChange={e => onSelect(e.target.value || null)}
      >
        <option value="">All Collections</option>
        {collections.map(c => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.symbol}) — {c.status}
          </option>
        ))}
      </select>

      {selected && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-base-200/50 p-2">
            <p className="text-[10px] text-base-content/40">Supply</p>
            <p className="text-sm font-bold">{selected.maxSupply.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-base-200/50 p-2">
            <p className="text-[10px] text-base-content/40">Price</p>
            <p className="text-sm font-bold">{Number(BigInt(selected.mintPrice) / 10n ** 16n) / 100} ETH</p>
          </div>
          <div className="rounded-lg bg-base-200/50 p-2">
            <p className="text-[10px] text-base-content/40">Mints</p>
            <p className="text-sm font-bold">{selected._count.mintRecords}</p>
          </div>
        </div>
      )}

      {selected?.contractAddress && (
        <p className="mt-2 text-[10px] text-base-content/30 font-mono truncate">
          Contract: {selected.contractAddress}
        </p>
      )}
    </div>
  );
}
