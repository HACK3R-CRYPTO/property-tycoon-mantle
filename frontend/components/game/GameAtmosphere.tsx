'use client';

import { motion } from 'framer-motion';
import { Sparkles, Cloud } from 'lucide-react';

export function GameAtmosphere() {
  return (
    <>
      {/* Vignette overlay */}
      <div className="fixed inset-0 pointer-events-none z-[5]">
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30" />
      </div>

      {/* Floating ambient particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[5]">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: 15 + Math.random() * 15,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
          >
            <Sparkles
              className="text-amber-500/20"
              size={Math.random() * 20 + 10}
              style={{
                filter: 'blur(1px)',
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Drifting clouds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[5]">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`cloud-${i}`}
            className="absolute"
            initial={{
              x: -200,
              y: 100 + i * 200,
            }}
            animate={{
              x: window.innerWidth + 200,
            }}
            transition={{
              duration: 60 + i * 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Cloud
              className="text-white/5"
              size={150 + i * 50}
              style={{
                filter: 'blur(3px)',
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[35]">
        {/* Top-left corner */}
        <div className="absolute top-4 left-4">
          <div className="relative">
            <div className="w-16 h-16 border-t-4 border-l-4 border-amber-500/30 rounded-tl-2xl" />
            <motion.div
              className="absolute -top-1 -left-1 w-2 h-2 bg-amber-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </div>
        </div>

        {/* Top-right corner */}
        <div className="absolute top-4 right-4">
          <div className="relative">
            <div className="w-16 h-16 border-t-4 border-r-4 border-amber-500/30 rounded-tr-2xl" />
            <motion.div
              className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
              }}
            />
          </div>
        </div>

        {/* Bottom-left corner */}
        <div className="absolute bottom-4 left-4">
          <div className="relative">
            <div className="w-16 h-16 border-b-4 border-l-4 border-amber-500/30 rounded-bl-2xl" />
            <motion.div
              className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 1,
              }}
            />
          </div>
        </div>

        {/* Bottom-right corner */}
        <div className="absolute bottom-4 right-4">
          <div className="relative">
            <div className="w-16 h-16 border-b-4 border-r-4 border-amber-500/30 rounded-br-2xl" />
            <motion.div
              className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 1.5,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
