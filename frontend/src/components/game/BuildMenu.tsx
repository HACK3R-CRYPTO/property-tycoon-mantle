'use client';

import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BuildMenuProps {
  onBuildProperty: (type: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury') => void | Promise<void>;
  tokenBalance: bigint;
  isMinting?: boolean;
}

const PROPERTY_TYPES = [
  {
    type: 'Residential' as const,
    name: 'Residential',
    cost: 100n * 10n ** 18n,
    yieldRate: 500, // 5% APY
    color: 'bg-blue-500',
    description: 'Stable yield, lower risk',
  },
  {
    type: 'Commercial' as const,
    name: 'Commercial',
    cost: 200n * 10n ** 18n,
    yieldRate: 800, // 8% APY
    color: 'bg-green-500',
    description: 'Balanced returns',
  },
  {
    type: 'Industrial' as const,
    name: 'Industrial',
    cost: 500n * 10n ** 18n,
    yieldRate: 1200, // 12% APY
    color: 'bg-orange-500',
    description: 'Higher yield, higher risk',
  },
  {
    type: 'Luxury' as const,
    name: 'Luxury',
    cost: 1000n * 10n ** 18n,
    yieldRate: 1500, // 15% APY
    color: 'bg-pink-500',
    description: 'Maximum returns',
  },
];

export function BuildMenu({ onBuildProperty, tokenBalance, isMinting = false }: BuildMenuProps) {
  const formatValue = (value: bigint) => {
    return (Number(value) / 1e18).toFixed(0);
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Build New Property
        </CardTitle>
        <p className="text-sm text-gray-400">Balance: {formatValue(tokenBalance)} TYCOON</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {PROPERTY_TYPES.map((prop) => {
          const canAfford = tokenBalance >= prop.cost;
          return (
            <div
              key={prop.type}
              className={`p-4 rounded-lg border ${
                canAfford ? 'border-white/20 bg-white/5' : 'border-gray-700/50 bg-gray-800/30 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${prop.color} flex items-center justify-center`}>
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{prop.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">{prop.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatValue(prop.cost)} TYCOON</p>
                  <p className="text-xs text-emerald-400">{prop.yieldRate / 100}% APY</p>
                </div>
              </div>
              <Button
                onClick={() => onBuildProperty(prop.type)}
                disabled={!canAfford || isMinting}
                className="w-full"
                variant={canAfford ? 'default' : 'outline'}
              >
                {isMinting ? 'Minting...' : canAfford ? 'Build' : 'Insufficient Funds'}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
