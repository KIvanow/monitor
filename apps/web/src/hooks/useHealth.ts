import { useState, useEffect } from 'react';
import { HealthResponse } from '../types/health';
import { fetchHealth } from '../api/health';

const REFRESH_INTERVAL = 5000;

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchHealth();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health status');
      } finally {
        setLoading(false);
      }
    }

    loadHealth();

    const interval = setInterval(loadHealth, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return { health, loading, error };
}
