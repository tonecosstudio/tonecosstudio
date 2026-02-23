/**
 * Hook para gerenciar indicadores de atualização em tempo real
 * 
 * Requirements: 16.1-16.15
 */

import { useState, useCallback, useEffect } from 'react';

interface UseRealtimeIndicatorReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
  hasNewUpdates: boolean;
  newUpdateCount: number;
  incrementUpdateCount: () => void;
  resetUpdateCount: () => void;
  setConnectionStatus: (connected: boolean) => void;
  setReconnectingStatus: (reconnecting: boolean) => void;
  setError: (error: Error | null) => void;
}

export function useRealtimeIndicator(): UseRealtimeIndicatorReturn {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [newUpdateCount, setNewUpdateCount] = useState<number>(0);

  const incrementUpdateCount = useCallback(() => {
    setNewUpdateCount(prev => prev + 1);
  }, []);

  const resetUpdateCount = useCallback(() => {
    setNewUpdateCount(0);
  }, []);

  const setConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  const setReconnectingStatus = useCallback((reconnecting: boolean) => {
    setIsReconnecting(reconnecting);
  }, []);

  // Simula reconexão periódica para demonstração
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isConnected && Math.random() > 0.7) {
        setIsConnected(true);
        setIsReconnecting(false);
        setError(null);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    isReconnecting,
    error,
    hasNewUpdates: newUpdateCount > 0,
    newUpdateCount,
    incrementUpdateCount,
    resetUpdateCount,
    setConnectionStatus,
    setReconnectingStatus,
    setError
  };
}

// Hook simplificado para componentes que só precisam do indicador
export function useRealtimeIndicatorSimple() {
  const { hasNewUpdates, newUpdateCount, resetUpdateCount } = useRealtimeIndicator();
  
  return {
    hasNewUpdates,
    newUpdateCount,
    resetUpdateCount
  };
}