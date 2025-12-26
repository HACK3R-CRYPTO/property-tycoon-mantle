'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export interface FloatingNumberData {
  id: string;
  value: number;
  x: number;
  y: number;
  type: 'damage' | 'heal' | 'gold' | 'elixir' | 'trophy';
  prefix?: string;
}

interface FloatingNumberProps {
  data: FloatingNumberData;
  onComplete: (id: string) => void;
}

export function FloatingNumber({ data, onComplete }: FloatingNumberProps) {
  const getColor = () => {
    switch (data.type) {
      case 'damage':
        return 'text-red-500';
      case 'heal':
        return 'text-green-500';
      case 'gold':
        return 'text-amber-400';
      case 'elixir':
        return 'text-purple-400';
      case 'trophy':
        return 'text-blue-400';
      default:
        return 'text-white';
    }
  };

  const getPrefix = () => {
    if (data.prefix) return data.prefix;
    return data.value > 0 ? '+' : '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.5, 1.2, 1, 0.8] }}
      transition={{
        duration: 2,
        ease: 'easeOut',
        times: [0, 0.2, 0.8, 1],
      }}
      onAnimationComplete={() => onComplete(data.id)}
      className="absolute pointer-events-none"
      style={{
        left: data.x,
        top: data.y,
      }}
    >
      <div
        className={`font-bold text-2xl ${getColor()}`}
        style={{
          textShadow: '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '0.05em',
        }}
      >
        {getPrefix()}{Math.abs(data.value).toLocaleString()}
      </div>
    </motion.div>
  );
}

// Container component to manage multiple floating numbers
interface FloatingNumbersContainerProps {
  numbers: FloatingNumberData[];
  onRemove: (id: string) => void;
}

export function FloatingNumbersContainer({
  numbers,
  onRemove,
}: FloatingNumbersContainerProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {numbers.map((num) => (
        <FloatingNumber key={num.id} data={num} onComplete={onRemove} />
      ))}
    </div>
  );
}
