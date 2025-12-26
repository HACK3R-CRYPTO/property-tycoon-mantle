'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useChat } from '@/hooks/useChat';

interface GlobalChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalChat({ isOpen, onClose }: GlobalChatProps) {
  const { messages, isLoading, isSending, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    try {
      await sendMessage(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

          {/* Chat Panel */}
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
                  <div className="absolute inset-0 bg-emerald-500 blur-md opacity-50 rounded-full" />
                  <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-full">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Global Chat
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h2>
                  <p className="text-xs text-emerald-400/80">Live on Mantle Network</p>
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

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {isLoading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-500" />
                  <p>Loading messages...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                      <p>No messages yet. Be the first to say hello!</p>
                    </div>
                  )}
                  
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!msg.isMe && (
                          <Avatar className="w-8 h-8 border border-white/20">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-xs text-white">
                              {msg.username?.[0] || msg.walletAddress.slice(2, 3).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`space-y-1 ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!msg.isMe && (
                            <span className="text-xs text-gray-400 ml-1">
                              {msg.username || `${msg.walletAddress.slice(0, 6)}...${msg.walletAddress.slice(-4)}`}
                            </span>
                          )}
                          <div
                            className={`p-3 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                              msg.isMe
                                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-none'
                                : 'bg-white/10 text-gray-100 border border-white/10 rounded-tl-none'
                            }`}
                          >
                            {msg.message}
                          </div>
                          <span className="text-[10px] text-gray-500 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                />
                <Button
                  onClick={handleSend}
                  disabled={isSending || !inputValue.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-900/20"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
