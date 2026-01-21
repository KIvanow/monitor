import { useMemo } from 'react';
import { usePolling } from './usePolling';
import { metricsApi } from '../api/metrics';
import type { ClusterSlowlogEntry } from '../types/cluster';

export function useClusterSlowlog(limit = 100) {
  const { data, error, loading, refresh } = usePolling({
    fetcher: (signal?: AbortSignal) => metricsApi.getClusterSlowlog(limit, signal),
    interval: 10000,
    enabled: true,
  });

  const entries = data || [];

  // Group entries by node
  const byNode = useMemo(() => {
    const grouped = new Map<string, ClusterSlowlogEntry[]>();

    for (const entry of entries) {
      const nodeEntries = grouped.get(entry.nodeId) || [];
      nodeEntries.push(entry);
      grouped.set(entry.nodeId, nodeEntries);
    }

    return grouped;
  }, [entries]);

  // Find which node has the most slow queries
  const slowestNode = useMemo(() => {
    if (byNode.size === 0) return null;

    let maxCount = 0;
    let slowestNodeId: string | null = null;
    let slowestNodeAddress: string | null = null;

    for (const [nodeId, nodeEntries] of byNode.entries()) {
      if (nodeEntries.length > maxCount) {
        maxCount = nodeEntries.length;
        slowestNodeId = nodeId;
        slowestNodeAddress = nodeEntries[0]?.nodeAddress || null;
      }
    }

    return slowestNodeId
      ? {
          nodeId: slowestNodeId,
          nodeAddress: slowestNodeAddress,
          count: maxCount,
        }
      : null;
  }, [byNode]);

  // Get unique node IDs for filtering
  const nodeIds = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.nodeId)));
  }, [entries]);

  return {
    entries,
    byNode,
    slowestNode,
    nodeIds,
    isLoading: loading,
    error,
    refresh,
  };
}
