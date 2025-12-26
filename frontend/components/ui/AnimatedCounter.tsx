'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatValue?: (value: number) => string;
  showChangeIndicator?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className = '',
  formatValue = (v) => v.toLocaleString(),
  showChangeIndicator = true,
}: AnimatedCounterProps) {
  const [previousValue, setPreviousValue] = useState(value);
  const [showIndicator, setShowIndicator] = useState(false);
  const spring = useSpring(value, { duration });
  const display = useTransform(spring, (current) => formatValue(Math.round(current)));

  useEffect(() => {
    if (value !== previousValue && showChangeIndicator) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 1500);

      setPreviousValue(value);
      spring.set(value);

      return () => clearTimeout(timer);
    } else {
      spring.set(value);
    }
  }, [value]);

  const change = value - previousValue;
  const isIncrease = change > 0;

  return (
    <div className="relative inline-block">
      <motion.span className={className}>{display}</motion.span>

      {showIndicator && change !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 1.5 }}
          className={`absolute -top-6 right-0 text-xs font-bold ${
            isIncrease ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isIncrease ? '+' : ''}{change.toLocaleString()}
        </motion.div>
      )}
    </div>
  );
}
