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

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL 
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
  : 'http://localhost:3001';

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

    console.log('Connecting to WebSocket at:', BACKEND_URL);
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to chat WebSocket');
      socket.emit('subscribe:chat');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    socket.on('chat:new', (message: ChatMessage) => {
      console.log('📨 New chat message received:', message);
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            ...message,
            isMe: message.walletAddress?.toLowerCase() === address?.toLowerCase(),
          },
        ];
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat:', reason);
    });

    socketRef.current = socket;

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, [address]);

  const sendMessage = async (message: string) => {
    if (!address || !message.trim()) {
      console.warn('Cannot send message: missing address or empty message');
      return;
    }

    setIsSending(true);
    try {
      console.log('📤 Sending message:', message);
      const response = await api.post('/chat/messages', {
        message: message.trim(),
        walletAddress: address,
      });
      console.log('✅ Message sent successfully:', response);
      // Message will be added via WebSocket event
    } catch (error) {
      console.error('❌ Failed to send message:', error);
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

