'use client';

import { Toaster } from '@/components/ui/toast';
import { ToastProvider as ToastContextProvider, useToast } from '@/contexts/ToastContext';

function ToasterComponent() {
  const { toasts, dismiss } = useToast();
  return <Toaster toasts={toasts} dismiss={dismiss} />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContextProvider>
      {children}
      <ToasterComponent />
    </ToastContextProvider>
  );
}
