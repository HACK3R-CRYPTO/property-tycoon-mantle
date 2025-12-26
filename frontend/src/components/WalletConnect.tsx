'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <div className="font-medium">{address.slice(0, 6)}...{address.slice(-4)}</div>
        </div>
        <Button onClick={() => disconnect()} variant="outline">
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
        >
          {isPending ? 'Connecting...' : `Connect ${connector.name}`}
        </Button>
      ))}
    </div>
  );
}

