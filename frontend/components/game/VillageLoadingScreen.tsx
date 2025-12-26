'use client';

import { useEffect, useState } from 'react';
import { Swords, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const loadingTips = [
  "Build defenses to protect your village from raids",
  "Upgrade your Town Hall to unlock new buildings",
  "Train troops to attack other villages",
  "Collectors generate resources while you're away",
  "Strategic wall placement can save your village",
  "Army camps increase your maximum troop capacity",
  "Defense towers attack enemy troops automatically",
  "Plan your village layout carefully for maximum defense",
];

interface VillageLoadingScreenProps {
  onComplete?: () => void;
}

export function VillageLoadingScreen({ onComplete }: VillageLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(loadingTips[0]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Random tip on mount
    setCurrentTip(loadingTips[Math.floor(Math.random() * loadingTips.length)]);
  }, []);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsComplete(true);
          setTimeout(() => onComplete?.(), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black overflow-hidden"
        >
          {/* Animated Background */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/assets/bg/map001.svg')",
              filter: 'brightness(0.2)',
            }}
          />

          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-blue-900/20" />

          {/* Floating Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [-20, -40, -20],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              >
                <Sparkles
                  className="text-amber-500/30"
                  size={Math.random() * 20 + 10}
                />
              </motion.div>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="mb-8"
            >
              <div className="relative">
                {/* Glow effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 blur-2xl"
                />

                {/* Logo icon */}
                <div className="relative w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <Swords className="w-14 h-14 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>

            {/* Game Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-12"
            >
              <h1
                className="text-5xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4"
                style={{ letterSpacing: '0.15em' }}
              >
                CLASH ON SOMNIA
              </h1>

              {/* Blockchain Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Powered by Somnia
                </span>
              </motion.div>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Loading Progress</span>
                <span className="text-sm font-bold text-amber-400">{progress}%</span>
              </div>

              {/* Progress bar container */}
              <div className="relative h-3 rounded-full bg-gray-800/50 border border-gray-700/50 overflow-hidden backdrop-blur-sm">
                {/* Background shimmer */}
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />

                {/* Progress fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full"
                >
                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                </motion.div>
              </div>
            </motion.div>

            {/* Loading Tip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="mt-12 max-w-md text-center"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tip</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                💡 {currentTip}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
