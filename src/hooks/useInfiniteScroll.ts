import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  initialItemsPerPage?: number;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  displayedItems: T[];
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  reset: () => void;
  sentinelRef: (node: HTMLElement | null) => void;
}

export function useInfiniteScroll<T>(
  allItems: T[],
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn<T> {
  const {
    threshold = 100,
    initialItemsPerPage = 12,
    enabled = true,
  } = options;

  const [displayCount, setDisplayCount] = useState(initialItemsPerPage);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelNodeRef = useRef<HTMLElement | null>(null);

  const displayedItems = allItems.slice(0, displayCount);
  const hasMore = displayCount < allItems.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    
    setIsLoading(true);
    // Simulate small delay for smoother UX
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + initialItemsPerPage, allItems.length));
      setIsLoading(false);
    }, 100);
  }, [hasMore, isLoading, initialItemsPerPage, allItems.length]);

  const reset = useCallback(() => {
    setDisplayCount(initialItemsPerPage);
    setIsLoading(false);
  }, [initialItemsPerPage]);

  // Reset when items change
  useEffect(() => {
    reset();
  }, [allItems.length, reset]);

  // Intersection Observer callback
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && enabled && hasMore && !isLoading) {
        loadMore();
      }
    },
    [enabled, hasMore, isLoading, loadMore]
  );

  // Sentinel ref callback for intersection observer
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node && enabled) {
        observerRef.current = new IntersectionObserver(handleIntersection, {
          root: null,
          rootMargin: `${threshold}px`,
          threshold: 0,
        });
        observerRef.current.observe(node);
        sentinelNodeRef.current = node;
      }
    },
    [enabled, threshold, handleIntersection]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    displayedItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
    sentinelRef,
  };
}