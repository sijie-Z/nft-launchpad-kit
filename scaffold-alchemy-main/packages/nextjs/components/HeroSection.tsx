"use client";

const FEATURES = [
  { label: "6 Mint Modes", desc: "Public, Allowlist, Dutch Auction, Signature, ERC-20, Claim" },
  { label: "ERC721A", desc: "Gas-optimized batch minting, up to 90% savings" },
  { label: "Factory Clone", desc: "Deploy new collections for ~371k gas" },
  { label: "Phased Drops", desc: "Multi-stage claim conditions with per-wallet limits" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-base-100 to-secondary/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-12">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="badge badge-primary badge-outline gap-2 px-4 py-3 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live on Sepolia Testnet
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center leading-tight mb-6">
          Launch Your NFT
          <br />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Collection</span>
        </h1>

        {/* Subtitle */}
        <p className="text-center text-base-content/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Professional-grade NFT minting platform with whitelist management, Dutch auctions, signature-based mints, and
          phased claim conditions. No code required.
        </p>

        {/* CTA */}
        <div className="flex justify-center mb-16">
          <a href="#mint" className="btn btn-primary btn-lg gap-2">
            Start Minting
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.label} className="card bg-base-100/60 backdrop-blur border border-base-content/5 shadow-sm">
              <div className="card-body p-4 text-center">
                <h3 className="font-semibold text-sm">{f.label}</h3>
                <p className="text-xs text-base-content/50 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
