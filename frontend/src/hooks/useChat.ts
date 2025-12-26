'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  walletAddress: string;
  username?: string;
  message: string;
  createdAt: string;
  isMe?: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useChat() {
  const { address } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await api.get('/chat/messages?limit=50');
        const formatted = data.map((msg: any) => ({
          ...msg,
          isMe: msg.walletAddress?.toLowerCase() === address?.toLowerCase(),
        }));
        setMessages(formatted.reverse()); // Reverse to show newest at bottom
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [address]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!address) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to chat');
      socket.emit('subscribe:chat');
    });

    socket.on('chat:new', (message: ChatMessage) => {
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          isMe: message.walletAddress?.toLowerCase() === address?.toLowerCase(),
        },
      ]);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [address]);

  const sendMessage = async (message: string) => {
    if (!address || !message.trim()) return;

    setIsSending(true);
    try {
      await api.post('/chat', {
        message: message.trim(),
        walletAddress: address,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
  };
}

