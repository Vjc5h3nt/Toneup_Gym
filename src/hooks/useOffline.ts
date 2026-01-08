import { useState, useEffect, useCallback, useRef } from 'react';

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const CACHE_PREFIX = 'gym_cache_';
const QUEUE_KEY = 'gym_offline_queue';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to cache data locally
 */
export function useLocalCache<T>(key: string) {
  const getCached = useCallback((): { data: T; timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
          return parsed;
        }
        // Remove expired cache
        localStorage.removeItem(CACHE_PREFIX + key);
      }
    } catch {
      // Invalid cache, ignore
    }
    return null;
  }, [key]);

  const setCache = useCallback((data: T) => {
    try {
      localStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {
      // Storage full or unavailable, ignore
    }
  }, [key]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch {
      // Ignore
    }
  }, [key]);

  return { getCached, setCache, clearCache };
}

/**
 * Hook to queue operations when offline
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineOperation[]>([]);
  const processingRef = useRef(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUEUE_KEY);
      if (saved) {
        setQueue(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save queue to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // Storage full or unavailable
    }
  }, [queue]);

  const addToQueue = useCallback((operation: Omit<OfflineOperation, 'id' | 'timestamp'>) => {
    const newOp: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newOp]);
    return newOp.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((op) => op.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const processQueue = useCallback(
    async (
      processor: (operation: OfflineOperation) => Promise<boolean>
    ): Promise<{ success: number; failed: number }> => {
      if (processingRef.current || queue.length === 0) {
        return { success: 0, failed: 0 };
      }

      processingRef.current = true;
      let success = 0;
      let failed = 0;

      for (const operation of [...queue]) {
        try {
          const result = await processor(operation);
          if (result) {
            removeFromQueue(operation.id);
            success++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      processingRef.current = false;
      return { success, failed };
    },
    [queue, removeFromQueue]
  );

  return {
    queue,
    queueLength: queue.length,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
    isProcessing: processingRef.current,
  };
}

/**
 * Combined hook for offline-first data fetching
 */
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const isOnline = useOnlineStatus();
  const { getCached, setCache } = useLocalCache<T>(key);

  const fetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    // Try to get cached data first
    const cached = getCached();
    if (cached) {
      setData(cached.data);
      setIsFromCache(true);
    }

    // If online, fetch fresh data
    if (isOnline) {
      try {
        const freshData = await fetcher();
        setData(freshData);
        setCache(freshData);
        setIsFromCache(false);
        setError(null);
      } catch (err) {
        // If we have cached data, use it
        if (!cached) {
          setError(err instanceof Error ? err : new Error('Failed to fetch'));
        }
      }
    } else if (!cached) {
      setError(new Error('No cached data available'));
    }

    setIsLoading(false);
  }, [enabled, isOnline, fetcher, getCached, setCache]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    isOnline,
    refetch: fetch,
  };
}