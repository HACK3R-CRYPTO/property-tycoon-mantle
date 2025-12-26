'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore, useVillageStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { ResourceBar } from './ResourceBar';
import { LogOut, Swords, User, Trophy } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { village } = useVillageStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Clash on Somnia</h1>
          </div>

          {village && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-semibold">{village.trophies} Trophies</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ResourceBar />

          {user && (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{user.username}</span>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
