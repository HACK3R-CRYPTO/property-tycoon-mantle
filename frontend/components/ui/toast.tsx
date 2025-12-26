import * as React from 'react';
import { X } from 'lucide-react';
import { Toast as ToastType } from '@/hooks/use-toast';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss, className, ...props }: ToastProps) {
  return (
    <div
      className={`
        group pointer-events-auto relative flex w-full items-center justify-between
        space-x-4 overflow-hidden rounded-md border border-slate-200 p-6 pr-8 shadow-lg
        transition-all bg-white dark:border-slate-800 dark:bg-slate-950
        animate-in slide-in-from-top-full
        ${className || ''}
      `}
      {...props}
    >
      <div className="grid gap-1 flex-1">
        {toast.title && (
          <div className="text-sm font-semibold">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-sm opacity-90">{toast.description}</div>
        )}
      </div>
      {toast.action}
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-2 top-2 rounded-md p-1 text-slate-950/50 opacity-0 transition-opacity hover:text-slate-950 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 dark:text-slate-50/50 dark:hover:text-slate-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster({
  toasts,
  dismiss,
}: {
  toasts: ToastType[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:right-0 sm:top-0 sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
