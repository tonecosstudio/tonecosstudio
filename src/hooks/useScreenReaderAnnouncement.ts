/**
 * useScreenReaderAnnouncement Hook
 * Requirements: 20.1-20.15
 * Task: 27.2 Implementar regiões ARIA live
 * 
 * Provides a way to announce messages to screen readers
 */

import { useEffect, useRef, useCallback } from 'react';

type AnnouncementPriority = 'polite' | 'assertive';

export function useScreenReaderAnnouncement() {
  const announcementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((
    message: string,
    priority: AnnouncementPriority = 'polite'
  ) => {
    if (!announcementRef.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the priority
    announcementRef.current.setAttribute('aria-live', priority);
    
    // Set the message
    announcementRef.current.textContent = message;

    // Clear the message after it's been announced
    timeoutRef.current = setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { announcementRef, announce };
}

/**
 * Hook for announcing status changes
 */
export function useStatusAnnouncement() {
  const { announcementRef, announce } = useScreenReaderAnnouncement();

  const announceStatusChange = useCallback((
    oldStatus: string,
    newStatus: string,
    context?: string
  ) => {
    const message = context
      ? `${context}: Status alterado de ${oldStatus} para ${newStatus}`
      : `Status alterado de ${oldStatus} para ${newStatus}`;
    
    announce(message, 'polite');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Sucesso: ${message}`, 'polite');
  }, [announce]);

  const announceError = useCallback((message: string) => {
    announce(`Erro: ${message}`, 'assertive');
  }, [announce]);

  return {
    announcementRef,
    announceStatusChange,
    announceSuccess,
    announceError,
  };
}
