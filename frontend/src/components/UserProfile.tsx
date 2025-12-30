'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { address } = useAccount();
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && address) {
      loadProfile();
    }
  }, [isOpen, address]);

  const loadProfile = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);
    try {
      const profile = await api.get(`/users/profile/${address}`);
      if (profile) {
        setCurrentUsername(profile.username || null);
        setUsername(profile.username || '');
        setAvatar(profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`);
      } else {
        // Generate default avatar
        setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`);
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      setError(error.response?.data?.message || 'Failed to load profile');
      // Generate default avatar even on error
      setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!address || !username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const profile = await api.put(`/users/profile/${address}/username`, {
        username: username.trim(),
      });
      setCurrentUsername(profile.username || null);
      // Reload avatar to ensure it's updated
      setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`);
    } catch (error: any) {
      console.error('Failed to update username:', error);
      setError(error.response?.data?.message || 'Failed to update username');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Profile Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-gradient-to-l from-gray-900/95 to-gray-900/90 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500 blur-md opacity-50 rounded-full" />
                  <div className="relative bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-full">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Profile Settings</h2>
                  <p className="text-xs text-purple-400/80">Customize your identity</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-purple-500" />
                  <p>Loading profile...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center">
                    <Avatar className="w-24 h-24 border-4 border-white/20 mb-4">
                      <AvatarImage src={avatar} alt={username || address} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-2xl text-white">
                        {username?.[0] || address?.slice(2, 3).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-gray-400 text-center">
                      Avatar generated from your wallet address
                    </p>
                  </div>

                  {/* Wallet Address */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Wallet Address
                    </label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-400 font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Username
                    </label>
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter your username"
                      maxLength={100}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be displayed in chat instead of your wallet address
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Success Message */}
                  {currentUsername && !error && (
                    <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-sm text-green-400">
                      Username saved successfully!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
              <Button
                onClick={handleSave}
                disabled={isSaving || !username.trim() || username === currentUsername}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-900/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Username
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


