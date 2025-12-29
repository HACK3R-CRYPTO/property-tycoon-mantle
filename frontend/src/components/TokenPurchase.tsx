'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Loader2 } from 'lucide-react';
import { CONTRACTS, TOKEN_SWAP_ABI } from '@/lib/contracts';

export function TokenPurchase() {
  const { address, isConnected } = useAccount();
  const [mntAmount, setMntAmount] = useState<string>('0.01');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { writeContract: writeBuyTokens, data: buyHash, isPending: isBuyPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: buyHash,
  });

  // Calculate TYCOON amount (1 MNT = 100 TYCOON)
  const tycoonAmount = mntAmount ? (parseFloat(mntAmount) * 100).toFixed(0) : '0';

  // Get TokenSwap balance
  const { data: swapBalance } = useReadContract({
    address: CONTRACTS.TokenSwap,
    abi: TOKEN_SWAP_ABI,
    functionName: 'getTokenBalance',
    query: { enabled: !!CONTRACTS.TokenSwap },
  });

  const handlePurchase = async () => {
    if (!address || !isConnected) return;
    if (!mntAmount || parseFloat(mntAmount) < 0.001) {
      alert('Minimum purchase is 0.001 MNT');
      return;
    }

    try {
      setIsPurchasing(true);
      const mntAmountWei = parseEther(mntAmount);
      
      writeBuyTokens({
        address: CONTRACTS.TokenSwap,
        abi: TOKEN_SWAP_ABI,
        functionName: 'buyTokens',
        value: mntAmountWei,
      });
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      alert('Failed to purchase tokens. Please try again.');
      setIsPurchasing(false);
    }
  };

  // Reset after successful purchase
  useEffect(() => {
    if (isConfirmed && isPurchasing) {
      setIsPurchasing(false);
      setMntAmount('0.01');
      // Balance will update automatically via useReadContract hook
    }
  }, [isConfirmed, isPurchasing]);

  const isProcessing = isBuyPending || isConfirming || isPurchasing;
  const canPurchase = isConnected && mntAmount && parseFloat(mntAmount) >= 0.001 && !isProcessing;

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Buy TYCOON Tokens
        </CardTitle>
        <p className="text-sm text-gray-400">
          Exchange Rate: 1 MNT = 100 TYCOON
        </p>
        {swapBalance && (
          <p className="text-xs text-gray-500">
            Available: {formatEther(swapBalance as bigint)} TYCOON
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-gray-300 mb-2 block">MNT Amount</label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={mntAmount}
            onChange={(e) => setMntAmount(e.target.value)}
            placeholder="0.01"
            disabled={isProcessing}
            className="bg-white/5 border-white/10 text-white"
          />
          <p className="text-xs text-gray-400 mt-1">
            Minimum: 0.001 MNT
          </p>
        </div>

        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">You will receive:</span>
            <span className="text-lg font-semibold text-emerald-400">
              {tycoonAmount} TYCOON
            </span>
          </div>
        </div>

        {!isConnected ? (
          <Button disabled className="w-full">
            Connect Wallet to Purchase
          </Button>
        ) : (
          <Button
            onClick={handlePurchase}
            disabled={!canPurchase}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isBuyPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Purchasing...'}
              </>
            ) : (
              `Buy ${tycoonAmount} TYCOON`
            )}
          </Button>
        )}

        {buyHash && (
          <p className="text-xs text-gray-400 text-center">
            Transaction: {buyHash.slice(0, 10)}...{buyHash.slice(-8)}
          </p>
        )}

        {isConfirmed && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
            <p className="text-sm text-emerald-400 text-center">
              ✅ Purchase successful! Your TYCOON balance will update automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

