"use client";

import { useEffect, useState } from "react";
import { type Chain, createPublicClient, http } from "viem";
import scaffoldConfig from "~~/scaffold.config";

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: { trait_type: string; value: string }[];
}

// Minimal ABI for tokenURI
const ERC721_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const IPFS_GATEWAYS = ["https://ipfs.io/ipfs/", "https://nftstorage.link/ipfs/", "https://dweb.link/ipfs/"];

function resolveIpfsUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAYS[0]}${uri.slice(7)}`;
  }
  if (uri.startsWith("ar://")) {
    return `https://arweave.net/${uri.slice(5)}`;
  }
  return uri;
}

async function fetchWithFallback(ipfsPath: string): Promise<Response | null> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gateway}${ipfsPath}`);
      if (res.ok) return res;
    } catch {
      // Try next gateway
    }
  }
  return null;
}

async function fetchJsonFromUri(uri: string): Promise<NFTMetadata | null> {
  // Try primary URI first
  const resolvedUrl = resolveIpfsUri(uri);
  const primaryRes = await fetch(resolvedUrl);
  if (primaryRes.ok) {
    return primaryRes.json();
  }

  // Fallback: if ipfs:// URI, try alternative gateways
  if (uri.startsWith("ipfs://")) {
    const ipfsPath = uri.slice(7);
    const fallbackRes = await fetchWithFallback(ipfsPath);
    if (fallbackRes) return fallbackRes.json();
  }

  return null;
}

export function NFTTokenCard({
  contractAddress,
  tokenId,
  collectionName,
}: {
  contractAddress: string;
  tokenId: number;
  collectionName: string;
}) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!contractAddress) return;

    const fetchMetadata = async () => {
      try {
        const chain = scaffoldConfig.targetNetworks[0] as Chain;
        const client = createPublicClient({
          chain,
          transport: http(),
        });

        const uri = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC721_ABI,
          functionName: "tokenURI",
          args: [BigInt(tokenId)],
        });

        if (!uri) {
          setError(true);
          return;
        }

        const data = await fetchJsonFromUri(uri);
        if (!data) {
          setError(true);
          return;
        }

        // Resolve image IPFS URI
        if (data.image) {
          data.image = resolveIpfsUri(data.image);
        }

        setMetadata(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [contractAddress, tokenId]);

  return (
    <div className="card bg-base-100 shadow-xl overflow-hidden group">
      {/* Image */}
      <figure className="relative aspect-square bg-base-200">
        {loading ? (
          <div className="skeleton w-full h-full" />
        ) : error || !metadata?.image ? (
          <div className="flex items-center justify-center w-full h-full text-base-content/30">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ) : (
          <img
            src={metadata.image}
            alt={metadata.name || `Token #${tokenId}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}
      </figure>

      {/* Info */}
      <div className="card-body p-4">
        <p className="text-xs text-base-content/40 mb-1">{collectionName}</p>
        <h3 className="font-semibold text-sm truncate">{metadata?.name || `Token #${tokenId}`}</h3>
        {metadata?.attributes && metadata.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {metadata.attributes.slice(0, 3).map((attr, i) => (
              <span key={i} className="badge badge-outline badge-xs">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
