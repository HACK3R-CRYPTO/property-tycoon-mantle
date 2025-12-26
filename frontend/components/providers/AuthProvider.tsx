'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    // Load user on app mount
    loadUser();
  }, [loadUser]);

  return <>{children}</>;
}
