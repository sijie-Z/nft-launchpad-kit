"use client";

import type { NextPage } from "next";
import { CollectionStats } from "~~/components/CollectionStats";
import { ContractInfo } from "~~/components/ContractInfo";
import { HeroSection } from "~~/components/HeroSection";
import { NFTMintUI } from "~~/components/NFTMintUI";
import { NetworkGuard } from "~~/components/NetworkGuard";
import { RecentMints } from "~~/components/RecentMints";

const Home: NextPage = () => {
  return (
    <NetworkGuard>
      <div className="flex flex-col flex-grow">
        {/* Hero */}
        <HeroSection />

        {/* Mint section */}
        <div id="mint" className="flex flex-col flex-grow pt-6 pb-24 px-2">
          {/* Collection metadata bar */}
          <div className="max-w-3xl mx-auto w-full mb-6">
            <CollectionStats />
          </div>

          {/* Main mint UI */}
          <NFTMintUI />

          {/* Bottom section: Contract info + Recent activity */}
          <div className="max-w-3xl mx-auto w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContractInfo />
            <RecentMints />
          </div>
        </div>
      </div>
    </NetworkGuard>
  );
};

export default Home;
