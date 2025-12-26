'use client';

import { Button } from '@/components/ui/button';
import { Building2, Users, Swords, History, Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface FloatingActionButtonsProps {
  onBuild: () => void;
  onTrainArmy: () => void;
  onAttack: () => void;
  onWarRoom: () => void;
  onChat: () => void;
  disabled?: boolean;
  armyReady?: boolean; // New prop to show army is ready
}

export function FloatingActionButtons({
  onBuild,
  onTrainArmy,
  onAttack,
  onWarRoom,
  onChat,
  disabled = false,
  armyReady = false,
}: FloatingActionButtonsProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const buttons = [
    {
      id: 'build',
      icon: Building2,
      onClick: onBuild,
      gradient: 'from-amber-500 to-orange-600',
      glowColor: 'rgba(251, 146, 60, 0.5)',
      title: 'Build',
      label: 'BUILD',
    },
    {
      id: 'train',
      icon: Users,
      onClick: onTrainArmy,
      gradient: 'from-purple-500 to-pink-600',
      glowColor: 'rgba(168, 85, 247, 0.5)',
      title: 'Train Army',
      label: 'ARMY',
    },
    {
      id: 'attack',
      icon: Swords,
      onClick: onAttack,
      gradient: 'from-red-500 to-pink-600',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      title: 'Attack',
      label: 'ATTACK',
      badge: armyReady,
    },
    {
      id: 'warroom',
      icon: History,
      onClick: onWarRoom,
      gradient: 'from-blue-500 to-cyan-600',
      glowColor: 'rgba(59, 130, 246, 0.5)',
      title: 'War Room',
      label: 'WARS',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      onClick: onChat,
      gradient: 'from-emerald-500 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.5)',
      title: 'Global Chat',
      label: 'CHAT',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex flex-col gap-4">
        {buttons.map((button, index) => (
          <motion.div
            key={button.id}
            initial={{ opacity: 0, x: 100, scale: 0.5 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
            className="relative"
            onMouseEnter={() => setHoveredButton(button.id)}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full blur-xl opacity-60"
              animate={{
                scale: hoveredButton === button.id ? 1.3 : 1,
                opacity: hoveredButton === button.id ? 0.8 : 0.4,
              }}
              style={{
                background: button.glowColor,
              }}
            />

            {/* Pulsing ring for army ready */}
            {button.badge && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-red-500"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 0.3, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}

            {/* Button */}
            <motion.button
              onClick={button.onClick}
              disabled={disabled}
              className={`
                relative h-16 w-16 rounded-full
                bg-gradient-to-br ${button.gradient}
                backdrop-blur-md border-2 border-white/20
                shadow-2xl disabled:opacity-50
                flex items-center justify-center
                overflow-hidden group
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={button.title}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
              </div>

              {/* Icon */}
              <motion.div
                animate={{
                  rotate: hoveredButton === button.id ? 360 : 0,
                }}
                transition={{ duration: 0.6 }}
              >
                <button.icon className="h-7 w-7 text-white relative z-10" />
              </motion.div>

              {/* Badge for army ready */}
              {button.badge && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  <Sparkles className="w-3 h-3 text-white absolute -top-0.5 -left-0.5" />
                </motion.div>
              )}
            </motion.button>

            {/* Label on hover */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: hoveredButton === button.id ? 1 : 0,
                x: hoveredButton === button.id ? -80 : 20,
              }}
              className="absolute right-20 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md border border-white/30 rounded-lg px-4 py-2 shadow-xl">
                <span className="text-white font-bold text-sm whitespace-nowrap" style={{ letterSpacing: '0.1em' }}>
                  {button.label}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
