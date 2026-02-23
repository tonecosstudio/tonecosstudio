/**
 * useTypingIndicator Hook
 * 
 * Manages typing state and broadcast/receive typing events via Supabase Realtime
 * 
 * Features:
 * - Debounced typing broadcasts (300ms)
 * - Automatic timeout after 3 seconds of inactivity
 * - Multi-user typing display
 * - Cleanup of stale typing indicators
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.7
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface UseTypingIndicatorOptions {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  debounceMs?: number; // default 300ms
  timeoutMs?: number;  // default 3000ms
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  typingText: string;
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useTypingIndicator({
  conversationId,
  currentUserId,
  currentUserName,
  debounceMs = 300,
  timeoutMs = 3000,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<RealtimeChannel>();

  // Setup Realtime Broadcast Channel
  useEffect(() => {
    console.log(`[useTypingIndicator] Setting up channel for conversation: ${conversationId}`);
    
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        broadcast: { 
          self: false, // Don't receive own events
          ack: false,  // Don't wait for acknowledgment (faster)
        },
      },
    });

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        console.log('[useTypingIndicator] Received typing event:', payload);
        const { userId, userName, action } = payload;
        
        if (action === 'start') {
          setTypingUsers(prev => {
            // Remove existing entry for this user
            const filtered = prev.filter(u => u.userId !== userId);
            // Add new entry
            return [...filtered, { userId, userName, timestamp: Date.now() }];
          });
        } else if (action === 'stop') {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }
      })
      .subscribe((status) => {
        console.log('[useTypingIndicator] Channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[useTypingIndicator] Cleaning up channel');
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Cleanup stale typing indicators (older than timeoutMs)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const filtered = prev.filter(u => now - u.timestamp < timeoutMs);
        if (filtered.length !== prev.length) {
          console.log('[useTypingIndicator] Cleaned up stale typing indicators');
        }
        return filtered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMs]);

  // Broadcast typing start (debounced)
  const startTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (!isTyping) {
        console.log('[useTypingIndicator] Broadcasting typing start');
        setIsTyping(true);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: currentUserId,
            userName: currentUserName,
            action: 'start',
          },
        });
      }

      // Auto-stop after timeoutMs
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
      stopTypingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, timeoutMs);
    }, debounceMs);
  }, [isTyping, currentUserId, currentUserName, debounceMs, timeoutMs]);

  // Broadcast typing stop
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }

    if (isTyping) {
      console.log('[useTypingIndicator] Broadcasting typing stop');
      setIsTyping(false);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          userName: currentUserName,
          action: 'stop',
        },
      });
    }
  }, [isTyping, currentUserId, currentUserName]);

  // Generate typing text
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} está digitando...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} e ${typingUsers[1].userName} estão digitando...`;
    }
    return `${typingUsers[0].userName} e outras ${typingUsers.length - 1} pessoas estão digitando...`;
  }, [typingUsers]);

  return {
    typingUsers,
    typingText,
    isTyping,
    startTyping,
    stopTyping,
  };
}
