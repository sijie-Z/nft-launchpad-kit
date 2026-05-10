import { headers } from "next/headers";
import { Providers } from "./providers";
import { cookieToInitialState } from "@account-kit/core";
import { config } from "~~/account.config";
import { ErrorBoundary } from "~~/components/ErrorBoundary";
import scaffoldConfig from "~~/scaffold.config";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-alchemy/getMetadata";

export const metadata = getMetadata({
  title: "NFT Launchpad Kit",
  description:
    "Deploy and manage professional NFT collections with 6 mint modes, phased claim conditions, Dutch auctions, allowlists, signature mints, and ERC-20 payments. Built on ERC721A for gas-optimized batch minting.",
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "NFT Launchpad Kit",
  description:
    "Professional NFT minting platform with 6 mint modes, phased claim conditions, and Factory Clone deployment.",
  applicationCategory: "DecentralizedApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "ETH",
  },
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  const targetNetwork = scaffoldConfig.targetNetworks[0];
  let initialState = cookieToInitialState(config, headers().get("cookie") ?? undefined);
  if (initialState?.alchemy?.chain?.id !== targetNetwork.id) {
    initialState = cookieToInitialState(config);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <Providers initialState={initialState}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
