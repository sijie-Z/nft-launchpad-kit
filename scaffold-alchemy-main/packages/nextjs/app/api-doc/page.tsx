import { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — NFT Launchpad Kit",
  description: "REST API reference for the NFT Launchpad Kit platform.",
};

export default function ApiDocPage() {
  return (
    <div className="min-h-screen bg-base-200 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-4">API Documentation</h1>
        <p className="text-base-content/60 mb-8">
          Full OpenAPI specification available at{" "}
          <a href="/openapi.yaml" className="link link-primary">
            /openapi.yaml
          </a>
        </p>

        <div className="space-y-6">
          <Section title="Collections" emoji="📦">
            <Endpoint
              method="GET"
              path="/api/collections"
              desc="List collections with search, sort, filter, pagination"
            />
            <Endpoint method="POST" path="/api/collections" desc="Create a new collection" />
            <Endpoint method="GET" path="/api/collections/:id" desc="Get collection details" />
            <Endpoint method="PUT" path="/api/collections/:id" desc="Update collection (owner only)" />
            <Endpoint method="DELETE" path="/api/collections/:id" desc="Delete collection (owner only)" />
          </Section>

          <Section title="Mint Records" emoji="🪙">
            <Endpoint method="GET" path="/api/mint-records" desc="Query mint records by collection or minter" />
            <Endpoint method="POST" path="/api/mint-records" desc="Record a mint transaction" />
          </Section>

          <Section title="Whitelist" emoji="📋">
            <Endpoint method="GET" path="/api/whitelist?collectionId=" desc="Get whitelist entries" />
            <Endpoint method="POST" path="/api/whitelist" desc="Batch add whitelist entries" />
            <Endpoint method="DELETE" path="/api/whitelist" desc="Batch delete whitelist entries" />
            <Endpoint method="POST" path="/api/whitelist/proof" desc="Generate Merkle proof for an address" />
          </Section>

          <Section title="Auth" emoji="🔑">
            <Endpoint method="POST" path="/api/auth" desc="Authenticate wallet address" />
          </Section>

          <Section title="Signature" emoji="✍️">
            <Endpoint method="POST" path="/api/signature" desc="Generate EIP-712 V2 mint signature" />
          </Section>

          <Section title="IPFS" emoji="📁">
            <Endpoint method="POST" path="/api/ipfs" desc="Upload NFT metadata to IPFS (Pinata)" />
          </Section>

          <Section title="Analytics" emoji="📊">
            <Endpoint method="GET" path="/api/analytics" desc="Platform or collection-level analytics" />
          </Section>

          <Section title="Health" emoji="💚">
            <Endpoint method="GET" path="/api/health" desc="Service health check" />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title text-lg">
          {emoji} {title}
        </h2>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: "badge-success",
    POST: "badge-info",
    PUT: "badge-warning",
    DELETE: "badge-error",
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`badge badge-sm ${colors[method] || "badge-ghost"} font-mono w-14 justify-center`}>
        {method}
      </span>
      <code className="font-mono text-xs">{path}</code>
      <span className="text-base-content/50 ml-auto text-xs">{desc}</span>
    </div>
  );
}
