import { useState, useEffect, useCallback, useRef } from 'react';
import { somniaSdk, CHAT_SCHEMA, PUBLISHER_ADDRESS } from '@/lib/somnia/somniaClient';
import { useToastStore } from '@/lib/stores/useToastStore';
import { apiClient } from '@/lib/api/client';

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  avatar?: string;
  isMe: boolean;
  type: 'chat' | 'system';
}

export function useSomniaChat(username: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { error: showError } = useToastStore();
  const timerRef = useRef<NodeJS.Timeout>();

  const loadMessages = useCallback(async () => {
    if (!PUBLISHER_ADDRESS || PUBLISHER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('Publisher address not set');
      return;
    }

    try {
      // Compute Schema ID (async)
      const schemaId = await somniaSdk.computeSchemaId(CHAT_SCHEMA);

      if (schemaId instanceof Error) {
        throw schemaId;
      }

      // Fetch data from Somnia Datastreams
      const response = await somniaSdk.streams.getAllPublisherDataForSchema(
        schemaId,
        PUBLISHER_ADDRESS as `0x${string}`
      );

      if (response instanceof Error) {
        console.error('Failed to fetch chat messages:', response);
        setIsLoading(false);
        setMessages([]);
        return;
      }

      // Parse response
      // Response is an array of rows, where each row is an array of fields
      // Schema: uint64 timestamp, string sender, string content, string avatar
      const parsedMessages: ChatMessage[] = response.map((row: any, index: number) => {
        // Helper to extract value
        const val = (f: any) => f?.value?.value ?? f?.value;
        
        const timestamp = Number(val(row[0]));
        const sender = String(val(row[1]));
        const content = String(val(row[2]));
        const avatar = String(val(row[3]));

        return {
          id: `${timestamp}-${index}`, // Unique ID
          sender,
          content,
          timestamp: new Date(timestamp),
          avatar,
          isMe: sender === username,
          type: 'chat',
        };
      });

      // Sort by timestamp
      parsedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setMessages(parsedMessages);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  }, [username]);

  // Polling
  useEffect(() => {
    loadMessages();
    timerRef.current = setInterval(loadMessages, 2000); // Poll every 2 seconds

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadMessages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsSending(true);
    try {
      // Send to backend which publishes to Somnia
      await apiClient.post('/chat', { content });
      
      // Optimistic update (optional, but good for UX)
      // We'll wait for the poll to confirm, but could add a temporary message here
    } catch (err) {
      console.error('Failed to send message:', err);
      showError('Failed to send', 'Could not publish message to Somnia');
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
