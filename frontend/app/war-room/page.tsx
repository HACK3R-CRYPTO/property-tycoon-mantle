'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarRoomRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to village page where War Room modal is available
    router.replace('/village');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Redirecting to Village...</h2>
        <p className="mt-2 text-muted-foreground">War Room is now accessible from your village</p>
      </div>
    </div>
  );
}
