/**
 * useRealtimeIndicator - Tracks realtime update counts
 */
import { useState, useCallback } from "react";

export function useRealtimeIndicator() {
  const [newUpdateCount, setNewUpdateCount] = useState(0);

  const incrementUpdateCount = useCallback(() => {
    setNewUpdateCount((prev) => prev + 1);
  }, []);

  const resetUpdateCount = useCallback(() => {
    setNewUpdateCount(0);
  }, []);

  return {
    hasNewUpdates: newUpdateCount > 0,
    newUpdateCount,
    incrementUpdateCount,
    resetUpdateCount,
  };
}
