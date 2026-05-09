import React from "react";
import { useChainId } from "wagmi";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { useTargetNetwork } from "~~/hooks/scaffold-alchemy";
import { useGlobalState } from "~~/services/store/store";

export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const chainId = useChainId();
  const { targetNetwork } = useTargetNetwork();
  const networkName = targetNetwork.name || `Chain ${chainId}`;

  return (
    <div className="min-h-0 py-4 px-4 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {nativeCurrencyPrice > 0 && (
              <div className="badge badge-ghost gap-1 font-mono text-xs">
                <CurrencyDollarIcon className="h-3 w-3" />
                <span>${nativeCurrencyPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
          <SwitchTheme className="pointer-events-auto" />
        </div>
      </div>
      <div className="w-full">
        <div className="flex justify-center items-center gap-3 text-xs text-base-content/30">
          <span className="font-medium">NFT Launchpad Kit</span>
          <span>·</span>
          <span>{networkName}</span>
          <span>·</span>
          <span>ERC-721</span>
        </div>
      </div>
    </div>
  );
};
