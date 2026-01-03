'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';

interface MiniChatProps {
  onExpand?: () => void;
}

// Color mapping for usernames (consistent colors based on address)
const getUsernameColor = (username: string | undefined, address: string): string => {
  if (!username) {
    // Use address to generate consistent color
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'text-emerald-400', // Green
      'text-purple-400',  // Purple
      'text-blue-400',    // Light blue
      'text-orange-400',   // Orange
      'text-pink-400',     // Pink
      'text-cyan-400',     // Cyan
    ];
    return colors[hash % colors.length];
  }
  
  // Use username for consistent color
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'text-emerald-400', // Green
    'text-purple-400',  // Purple
    'text-blue-400',    // Light blue
    'text-orange-400',   // Orange
    'text-pink-400',     // Pink
    'text-gray-400',     // Grey (for system messages)
  ];
  return colors[hash % colors.length];
};

export function MiniChat({ onExpand }: MiniChatProps) {
  const { messages, isSending, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show only last 5-6 messages
  const recentMessages = messages.slice(-6);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

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
    <div className="fixed bottom-4 left-[340px] z-40 w-80">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-lg border border-white/20 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div 
          className="px-3 py-2 border-b border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded && onExpand) {
              onExpand();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-sm opacity-50 rounded-full" />
              <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-full">
                <Globe className="w-3 h-3 text-white" />
              </div>
            </div>
            <span className="text-white text-sm font-semibold">GLO</span>
          </div>
        </div>

        {/* Messages List - Compact View */}
        {!isExpanded ? (
          <div className="px-3 py-2 max-h-48 overflow-y-auto space-y-1">
            {recentMessages.length === 0 ? (
              <p className="text-gray-500 text-xs py-2">No messages yet</p>
            ) : (
              recentMessages.map((msg) => {
                const username = msg.username || `${msg.walletAddress.slice(0, 6)}...${msg.walletAddress.slice(-4)}`;
                const color = getUsernameColor(msg.username, msg.walletAddress);
                
                // Check if it's a system message
                const isSystem = msg.message.toLowerCase().startsWith('system:') || msg.walletAddress === 'system';
                
                return (
                  <div key={msg.id} className="text-xs">
                    {isSystem ? (
                      <span className="text-gray-400">{msg.message}</span>
                    ) : (
                      <>
                        <span className={`font-medium ${color}`}>{username}</span>
                        <span className="text-gray-300 ml-1">: {msg.message}</span>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* Expanded Messages */}
            <ScrollArea className="flex-1 px-3 py-2 max-h-64">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-xs py-2">No messages yet</p>
                ) : (
                  messages.map((msg) => {
                    const username = msg.username || `${msg.walletAddress.slice(0, 6)}...${msg.walletAddress.slice(-4)}`;
                    const color = getUsernameColor(msg.username, msg.walletAddress);
                    const isSystem = msg.message.toLowerCase().startsWith('system:') || msg.walletAddress === 'system';
                    
                    return (
                      <div key={msg.id} className="text-xs">
                        {isSystem ? (
                          <span className="text-gray-400">{msg.message}</span>
                        ) : (
                          <>
                            <span className={`font-medium ${color}`}>{username}</span>
                            <span className="text-gray-300 ml-1">: {msg.message}</span>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-3 py-2 border-t border-white/10 bg-black/20">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type message"
                  disabled={isSending}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-xs h-8 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                />
                <Button
                  onClick={handleSend}
                  disabled={isSending || !inputValue.trim()}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-8 px-2"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

