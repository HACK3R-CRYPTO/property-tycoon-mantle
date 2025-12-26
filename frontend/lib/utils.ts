import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  // Always use comma separators for better readability
  return num.toLocaleString();
}

export function getResourceColor(resourceType: 'gold' | 'elixir'): string {
  return resourceType === 'gold' ? 'text-gold' : 'text-elixir';
}
