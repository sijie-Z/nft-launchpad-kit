"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDebounceValue } from "usehooks-ts";

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

const SORT_OPTIONS = [
  { value: "newest", label: "Recently Added" },
  { value: "oldest", label: "Oldest First" },
  { value: "mints", label: "Most Mints" },
  { value: "name", label: "Name A-Z" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "supply", label: "Largest Supply" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "deployed", label: "Deployed" },
  { value: "draft", label: "Draft" },
];

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [debouncedSearch] = useDebounceValue(search, 300);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (sort) params.set("sort", sort);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", page.toString());
      params.set("limit", "12");
      const res = await fetch(`/api/collections?${params}`);
      const data = await res.json();
      setCollections(data.collections || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load collections. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, sort, debouncedSearch, page]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, sort, debouncedSearch]);

  return (
    <div className="min-h-screen bg-base-200 py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">NFT Collections</h1>
            <p className="text-sm text-base-content/50 mt-1">
              {total} collection{total !== 1 ? "s" : ""} found
            </p>
          </div>
          <Link href="/admin" className="btn btn-primary btn-sm gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Collection
          </Link>
        </div>

        {/* Search + Filters + Sort */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search collections..."
              className="input input-bordered w-full pl-10 input-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="join">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`btn btn-sm join-item ${filter === f.value ? "btn-active" : ""}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            className="select select-bordered select-sm min-w-[180px]"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grid */}
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
            <button className="btn btn-primary" onClick={fetchCollections}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
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
            <div className="w-24 h-24 rounded-full bg-base-content/5 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <p className="text-xl text-base-content/50 mb-2">
              {search ? `No results for "${search}"` : "No collections yet"}
            </p>
            <p className="text-sm text-base-content/30 mb-6">
              {search ? "Try a different search term" : "Create your first NFT collection to get started"}
            </p>
            {!search && (
              <Link href="/admin" className="btn btn-primary">
                Create Collection
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map(c => (
                <Link key={c.id} href={`/collections/${c.id}`}>
                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 cursor-pointer group">
                    <figure className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
                      {c.coverImage ? (
                        <img
                          src={c.coverImage}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-5xl font-black text-primary/20 group-hover:text-primary/30 transition-colors">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Status badge overlay */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`badge badge-sm font-medium ${c.status === "active" ? "badge-success" : c.status === "deployed" ? "badge-info" : "badge-ghost"}`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </figure>
                    <div className="card-body p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="card-title text-base truncate">{c.name}</h2>
                          <p className="text-xs text-base-content/40 font-mono">{c.symbol}</p>
                        </div>
                      </div>
                      {c.description && (
                        <p className="text-xs text-base-content/50 line-clamp-2 mt-1">{c.description}</p>
                      )}
                      <div className="divider my-1" />
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex gap-3">
                          <div>
                            <span className="text-base-content/40">Supply</span>
                            <p className="font-semibold">{c.maxSupply.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-base-content/40">Price</span>
                            <p className="font-semibold">{Number(BigInt(c.mintPrice) / 10n ** 16n) / 100} ETH</p>
                          </div>
                          <div>
                            <span className="text-base-content/40">Mints</span>
                            <p className="font-semibold">{c._count.mintRecords}</p>
                          </div>
                        </div>
                        <div className="text-base-content/30 font-mono text-[10px]">
                          {c.owner.address.slice(0, 6)}...{c.owner.address.slice(-4)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-10">
                <div className="join">
                  <button className="btn btn-sm join-item" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    «
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`btn btn-sm join-item ${page === pageNum ? "btn-active" : ""}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="btn btn-sm join-item"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
