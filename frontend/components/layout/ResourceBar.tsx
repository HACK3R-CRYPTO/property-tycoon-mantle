'use client';

import { useVillageStore } from '@/lib/stores';
import { formatNumber } from '@/lib/utils';
import { Coins, Droplet } from 'lucide-react';

export function ResourceBar() {
  const { village } = useVillageStore();

  if (!village || !village.resources) {
    return null;
  }

  const { gold, elixir } = village.resources;

  return (
    <div className="flex items-center gap-6 rounded-lg bg-gradient-to-r from-amber-100 to-purple-100 px-6 py-3 shadow-lg dark:from-amber-950 dark:to-purple-950">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold shadow-md">
          <Coins className="h-6 w-6 text-yellow-900" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gold</p>
          <p className="text-lg font-bold text-gold-dark">{formatNumber(gold)}</p>
        </div>
      </div>

      <div className="h-10 w-px bg-gray-300 dark:bg-gray-700" />

      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-elixir shadow-md">
          <Droplet className="h-6 w-6 text-purple-100" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Elixir</p>
          <p className="text-lg font-bold text-elixir-dark">{formatNumber(elixir)}</p>
        </div>
      </div>
    </div>
  );
}
