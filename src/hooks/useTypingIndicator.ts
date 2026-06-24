/**
 * useTypingIndicator Hook
 *
 * Manages typing state and broadcast/receive typing events via Supabase Realtime.
 *
 * Features:
 * - Debounced typing broadcasts (300ms)
 * - Automatic timeout after 3 seconds of inactivity
 * - Multi-user typing display
 * - Cleanup of stale typing indicators
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.7
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { log } from "@/lib/logger";
import {
  subscribeToTypingIndicator,
  type TypingEventPayload,
  type TypingIndicatorSubscription,
} from "@/services/realtime/realtime-service";

type TimerHandle = ReturnType<typeof setTimeout>;

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
  timeoutMs?: number; // default 3000ms
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  typingText: string;
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

function isTypingEventPayload(payload: unknown): payload is TypingEventPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<Record<keyof TypingEventPayload, unknown>>;

  return (
    typeof candidate.userId === "string" &&
    typeof candidate.userName === "string" &&
    (candidate.action === "start" || candidate.action === "stop")
  );
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
  const typingTimeoutRef = useRef<TimerHandle>();
  const stopTypingTimeoutRef = useRef<TimerHandle>();
  const subscriptionRef = useRef<TypingIndicatorSubscription>();

  useEffect(() => {
    log.debug("Setting up typing indicator channel", { conversationId });

    const subscription = subscribeToTypingIndicator({
      conversationId,
      onTypingEvent: (payload) => {
        if (!isTypingEventPayload(payload)) {
          log.warn("Ignoring invalid typing indicator payload", { conversationId, payload });
          return;
        }

        log.debug("Received typing indicator event", { conversationId, payload });
        const { userId, userName, action } = payload;

        if (action === "start") {
          setTypingUsers((prev) => {
            const filtered = prev.filter((user) => user.userId !== userId);
            return [...filtered, { userId, userName, timestamp: Date.now() }];
          });
          return;
        }

        setTypingUsers((prev) => prev.filter((user) => user.userId !== userId));
      },
      onStatusChange: (status) => {
        log.debug("Typing indicator channel status changed", { conversationId, status });
      },
    });

    subscriptionRef.current = subscription;

    return () => {
      log.debug("Cleaning up typing indicator channel", { conversationId });
      subscription.unsubscribe();
      subscriptionRef.current = undefined;
    };
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setTypingUsers((prev) => {
        const filtered = prev.filter((user) => now - user.timestamp < timeoutMs);
        if (filtered.length !== prev.length) {
          log.debug("Cleaned up stale typing indicators", { conversationId });
        }
        return filtered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [conversationId, timeoutMs]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
    };
  }, []);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }

    if (!isTyping) {
      return;
    }

    log.debug("Broadcasting typing stop", { conversationId, currentUserId });
    setIsTyping(false);
    subscriptionRef.current?.sendTypingEvent({
      userId: currentUserId,
      userName: currentUserName,
      action: "stop",
    });
  }, [conversationId, currentUserId, currentUserName, isTyping]);

  const startTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (!isTyping) {
        log.debug("Broadcasting typing start", { conversationId, currentUserId });
        setIsTyping(true);
        subscriptionRef.current?.sendTypingEvent({
          userId: currentUserId,
          userName: currentUserName,
          action: "start",
        });
      }

      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
      stopTypingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, timeoutMs);
    }, debounceMs);
  }, [conversationId, currentUserId, currentUserName, debounceMs, isTyping, stopTyping, timeoutMs]);

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) {
      return "";
    }
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} esta digitando...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} e ${typingUsers[1].userName} estao digitando...`;
    }
    return `${typingUsers[0].userName} e outras ${typingUsers.length - 1} pessoas estao digitando...`;
  }, [typingUsers]);

  return {
    typingUsers,
    typingText,
    isTyping,
    startTyping,
    stopTyping,
  };
}
