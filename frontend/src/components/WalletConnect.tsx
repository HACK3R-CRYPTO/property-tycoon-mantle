'use client';

import { useAccount } from 'wagmi';
import { formatAddress } from '@/lib/utils';

export function WalletConnect() {
  const { address, isConnected } = useAccount();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
          <span className="text-sm font-medium text-white font-numbers">
            {formatAddress(address)}
          </span>
        </div>
        <w3m-button balance="hide" />
      </div>
    );
  }

  return <w3m-button />;
}
