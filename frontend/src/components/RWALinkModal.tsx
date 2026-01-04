'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { X, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CONTRACTS, PROPERTY_NFT_ABI } from '@/lib/contracts';
import { formatEther } from 'viem';
import { getPublicClient } from '@wagmi/core';
import { wagmiConfig } from '@/lib/mantle-viem';

interface RWALinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTokenId: number;
  onSuccess?: () => void;
}

// MockRWA ABI for reading token data
const MOCK_RWA_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'properties',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'value', type: 'uint256' },
      { name: 'monthlyYield', type: 'uint256' },
      { name: 'location', type: 'string' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getPropertyValue',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getAnnualYield',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getYieldRate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface RWAToken {
  tokenId: number;
  name?: string;
  value?: bigint;
  yield?: bigint;
  location?: string;
  isOwned?: boolean;
}

export function RWALinkModal({ isOpen, onClose, propertyTokenId, onSuccess }: RWALinkModalProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [availableTokens, setAvailableTokens] = useState<RWAToken[]>([]);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  // Write contract for linking
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Determine which RWA contract to use (oracle-based or fallback to MockRWA)
  const getRWAContract = () => {
    // Check for oracle-based RWA contract first (from CONTRACTS)
    if (CONTRACTS.OracleRWA && CONTRACTS.OracleRWA !== '0x0000000000000000000000000000000000000000') {
      return CONTRACTS.OracleRWA;
    }
    // Fallback to MockRWA
    return CONTRACTS.MockRWA;
  };

  // Load available RWA tokens (filtered by current user's ownership)
  useEffect(() => {
    const rwaContract = getRWAContract();
    
    if (!isOpen || !rwaContract || rwaContract === '0x0000000000000000000000000000000000000000' || !address) {
      setAvailableTokens([]);
      return;
    }

    const loadTokens = async () => {
      setLoading(true);
      try {
        const tokens: RWAToken[] = [];
        const publicClient = getPublicClient(wagmiConfig);
        if (!publicClient) {
          setLoading(false);
          return;
        }
        
        // Check tokens 0-19 (covers initial tokens and newly minted tokens)
        for (let i = 0; i < 20; i++) {
          try {
            // First check if token exists by checking ownerOf
            const owner = await publicClient.readContract({
              address: rwaContract,
              abi: MOCK_RWA_ABI,
              functionName: 'ownerOf',
              args: [BigInt(i)],
            }).catch(() => null);

            // If token doesn't exist, ownerOf will revert, so skip it
            if (!owner) continue;

            // IMPORTANT: Only show RWA tokens owned by the current user
            const ownerLower = (owner as string).toLowerCase();
            const userAddressLower = address.toLowerCase();
            if (ownerLower !== userAddressLower) {
              console.log(`Skipping RWA token ${i}: owned by ${owner}, not by user ${address}`);
              continue;
            }

            // Try to read property data
            const propertyData = await publicClient.readContract({
              address: rwaContract,
              abi: MOCK_RWA_ABI,
              functionName: 'properties',
              args: [BigInt(i)],
            });

            tokens.push({
              tokenId: i,
              name: propertyData[0] as string,
              value: propertyData[1] as bigint,
              yield: propertyData[2] as bigint,
              location: propertyData[3] as string,
              isOwned: true,
            });
          } catch (error) {
            // If token doesn't exist or can't read, skip it
            console.warn(`Failed to load RWA token ${i}:`, error);
          }
        }
        
        setAvailableTokens(tokens);
        console.log(`✅ Loaded ${tokens.length} RWA tokens owned by user ${address} from ${rwaContract === CONTRACTS.MockRWA ? 'MockRWA (fallback)' : 'Oracle RWA'}`);
      } catch (error) {
        console.error('Failed to load RWA tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [isOpen, address]);

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('✅ RWA link transaction confirmed!');
      console.log(`   Transaction hash: ${hash}`);
      console.log(`   Property #${propertyTokenId} is now linked to RWA token #${selectedTokenId}`);
      console.log(`   Yield calculation will now use RWA value and yield rate`);
      console.log(`   Refresh the page or wait a few seconds to see updated yield`);
      
      // Wait a bit for blockchain state to update, then reload
      setTimeout(() => {
      onSuccess?.();
      onClose();
      }, 3000);
    }
  }, [isSuccess, hash, onSuccess, onClose, propertyTokenId, selectedTokenId]);

  const handleLink = () => {
    const rwaContract = getRWAContract();
    if (!selectedTokenId || !rwaContract) {
      console.error('Cannot link: missing RWA contract or token ID');
      return;
    }

    try {
      console.log(`🔗 Attempting to link property ${propertyTokenId} to RWA:`, {
        rwaContract,
        rwaTokenId: selectedTokenId,
        propertyTokenId,
      });
      
      writeContract({
        address: CONTRACTS.PropertyNFT,
        abi: PROPERTY_NFT_ABI,
        functionName: 'linkToRWA',
        args: [BigInt(propertyTokenId), rwaContract, BigInt(selectedTokenId)],
      });
      
      console.log(`✅ Link transaction submitted! Waiting for confirmation...`);
      console.log(`   Property: #${propertyTokenId}`);
      console.log(`   RWA Contract: ${rwaContract}`);
      console.log(`   RWA Token: #${selectedTokenId}`);
      console.log(`   After confirmation, property will use RWA yield automatically`);
    } catch (error) {
      console.error('❌ Failed to link RWA:', error);
      alert('Failed to link property to RWA. Check console for details.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Link Property to RWA
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <p className="text-sm text-gray-400 mb-4">
            Select a Real-World Asset (RWA) token to link to your property. This connects your in-game property to a tokenized real-world asset.
            {getRWAContract() !== CONTRACTS.MockRWA && (
              <span className="block mt-2 text-emerald-400 text-xs">
                Using Oracle-based RWA contract
              </span>
            )}
            {getRWAContract() === CONTRACTS.MockRWA && (
              <span className="block mt-2 text-yellow-400 text-xs">
                Using MockRWA (fallback) - configure NEXT_PUBLIC_ORACLE_RWA_ADDRESS to use oracle
              </span>
            )}
          </p>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading RWA tokens...</div>
          ) : availableTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No RWA tokens available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTokens.map((token) => (
                <Card
                  key={token.tokenId}
                  className={`cursor-pointer transition-all ${
                    selectedTokenId === token.tokenId
                      ? 'bg-emerald-900/30 border-emerald-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedTokenId(token.tokenId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          {token.name || `RWA Token #${token.tokenId}`}
                        </p>
                        {token.location && (
                          <p className="text-xs text-gray-400 mt-1">{token.location}</p>
                        )}
                        {token.value && (
                          <p className="text-xs text-emerald-400 mt-1">
                            Value: ${(Number(formatEther(token.value))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        )}
                        {token.yield && token.value && (
                          <>
                          <p className="text-xs text-blue-400 mt-1">
                              Monthly: ${(Number(formatEther(token.yield))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-purple-400 mt-1 font-semibold">
                              APY: {((Number(formatEther(token.yield)) * 12 / Number(formatEther(token.value))) * 100).toFixed(2)}%
                          </p>
                          </>
                        )}
                      </div>
                      {selectedTokenId === token.tokenId && (
                        <Check className="w-5 h-5 text-emerald-400 ml-2" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isPending || isConfirming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedTokenId || isPending || isConfirming}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending || isConfirming ? 'Linking...' : 'Link Property'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

