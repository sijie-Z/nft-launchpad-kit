import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * GET /api/og — Dynamic Open Graph image generation
 *
 * Generates a branded OG image for social sharing.
 * Usage: /api/og?title=My%20Collection&subtitle=10000%20NFTs
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "NFT Launchpad Kit";
  const subtitle = searchParams.get("subtitle") || "Professional NFT Minting Platform";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          position: "relative",
        }}
      >
        {/* Accent circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            marginBottom: "32px",
            fontSize: "40px",
            fontWeight: 900,
            color: "white",
          }}
        >
          N
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 30 ? "48px" : "64px",
            fontWeight: 900,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "900px",
            padding: "0 40px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "rgba(255,255,255,0.5)",
            marginTop: "16px",
            textAlign: "center",
            maxWidth: "700px",
            padding: "0 40px",
          }}
        >
          {subtitle}
        </div>

        {/* Bottom badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "48px",
            padding: "12px 24px",
            borderRadius: "999px",
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.1)",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)" }}>Live on Sepolia Testnet</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
