// @ts-nocheck
/**
 * useVirtualizedList Hook
 * Requirements: 18.1-18.15
 * Task: 25.1 Implementar otimizações de performance
 *
 * Provides virtual scrolling for large lists using @tanstack/react-virtual
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface UseVirtualizedListOptions {
  itemCount: number;
  estimateSize?: number;
  overscan?: number;
}

export function useVirtualizedList({
  itemCount,
  estimateSize = 100,
  overscan = 5,
}: UseVirtualizedListOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
