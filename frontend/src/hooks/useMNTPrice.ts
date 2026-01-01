'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Backend API endpoint for MNT price (uses whitelisted backend wallet)
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL 
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
  : 'http://localhost:3001';

// Cache price for 5 minutes
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface PriceCache {
  price: number;
  timestamp: number;
}

let priceCache: PriceCache | null = null;

/**
 * Hook to fetch MNT/USD price from Chronicle Oracle
 * Returns TYCOON/USD rate (since 1 MNT = 100 TYCOON)
 */
export function useMNTPrice() {
  const [mntPrice, setMntPrice] = useState<number | null>(null);
  const [tycoonPrice, setTycoonPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initial fetch from API
    const fetchInitialPrice = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${BACKEND_API_URL}/api/oracle/mnt-price`);
        const data = await response.json();

        if (data.success && data.mntPriceUSD) {
          const priceInUSD = data.mntPriceUSD;
          const tycoonUSD = data.tycoonPriceUSD || priceInUSD / 100;

          // Update cache
          priceCache = {
            price: priceInUSD,
            timestamp: Date.now(),
          };

          setMntPrice(priceInUSD);
          setTycoonPrice(tycoonUSD);
          setLoading(false);
          console.log(`✅ Chronicle Oracle (via backend): MNT/USD = $${priceInUSD.toFixed(4)}, TYCOON/USD = $${tycoonUSD.toFixed(6)}`);
        } else {
          // Backend returned fallback price
          const fallbackPrice = data.mntPriceUSD || 0.98;
          const tycoonUSD = data.tycoonPriceUSD || fallbackPrice / 100;
          setMntPrice(fallbackPrice);
          setTycoonPrice(tycoonUSD);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch MNT price from backend:', err);
        setError(err.message || 'Failed to fetch price');
        setLoading(false);
        
        // Use cached price if available
        if (priceCache) {
          setMntPrice(priceCache.price);
          setTycoonPrice(priceCache.price / 100);
        } else {
          // Fallback: Use approximate MNT price
          const fallbackPrice = 0.98;
          setMntPrice(fallbackPrice);
          setTycoonPrice(fallbackPrice / 100);
        }
      }
    };

    // Set up Socket.io connection for real-time price updates
    const socket: Socket = io(BACKEND_API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket for price updates');
    });

    socket.on('price:update', (data: { mntPriceUSD: number; tycoonPriceUSD: number; timestamp: number }) => {
      console.log(`💰 Real-time price update: MNT/USD = $${data.mntPriceUSD.toFixed(4)}, TYCOON/USD = $${data.tycoonPriceUSD.toFixed(6)}`);
      
      // Update cache
      priceCache = {
        price: data.mntPriceUSD,
        timestamp: data.timestamp,
      };

      // Update state
      setMntPrice(data.mntPriceUSD);
      setTycoonPrice(data.tycoonPriceUSD);
      setLoading(false);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.warn('⚠️ Disconnected from WebSocket for price updates');
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket connection error:', err.message);
    });

    // Fetch initial price
    fetchInitialPrice();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    mntPriceUSD: mntPrice,
    tycoonPriceUSD: tycoonPrice,
    loading,
    error,
  };
}

/**
 * Convert TYCOON amount to USD
 */
export function tycoonToUSD(tycoonAmount: bigint | number, tycoonPriceUSD: number | null): number | null {
  if (!tycoonPriceUSD) return null;
  
  const tycoonNum = typeof tycoonAmount === 'bigint' 
    ? Number(tycoonAmount) / 1e18 
    : tycoonAmount;
  
  return tycoonNum * tycoonPriceUSD;
}

/**
 * Format USD value for display
 */
export function formatUSD(usdValue: number | null): string {
  if (usdValue === null) return '';
  if (usdValue < 0.01) return `$${usdValue.toFixed(4)}`;
  if (usdValue < 1) return `$${usdValue.toFixed(2)}`;
  return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

