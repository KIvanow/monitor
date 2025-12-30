import { useState, useEffect, useRef } from 'react';

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
}

export function usePolling<T>({ fetcher, interval = 5000, enabled = true }: UsePollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refresh = async () => {
      try {
        setError(null);
        const result = await fetcherRef.current();
        setData(result);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    refresh();
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [interval, enabled]);

  const manualRefresh = async () => {
    try {
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    }
  };

  return { data, error, loading, lastUpdated, refresh: manualRefresh };
}
