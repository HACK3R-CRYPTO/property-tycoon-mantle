'use client';

import { useToastStore } from '@/lib/stores/useToastStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return null;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'success':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'error':
        return 'from-red-500/20 to-red-600/20 border-red-500/30';
      case 'warning':
        return 'from-amber-500/20 to-amber-600/20 border-amber-500/30';
      case 'info':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      default:
        return 'from-white/10 to-white/5 border-white/20';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <div
              className={`
                relative overflow-hidden rounded-xl
                bg-gradient-to-br ${getGradient(toast.type)}
                backdrop-blur-md border
                shadow-2xl min-w-[320px] max-w-md
              `}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
              </div>

              <div className="relative p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(toast.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white mb-1" style={{ letterSpacing: '0.05em' }}>
                    {toast.title}
                  </h4>
                  {toast.message && (
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {toast.message}
                    </p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
                className="h-1 bg-gradient-to-r from-white/40 to-white/20 origin-left"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
