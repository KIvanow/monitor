import { useMemo } from 'react';
import { usePolling } from './usePolling';
import { metricsApi } from '../api/metrics';
import type { DiscoveredNode } from '../types/cluster';

export function useClusterNodes() {
  // Fetch discovered nodes
  const {
    data: nodes,
    error: nodesError,
    loading: nodesLoading,
    refresh: refreshNodes,
  } = usePolling({
    fetcher: (signal?: AbortSignal) => metricsApi.discoverClusterNodes(signal),
    interval: 30000,
    enabled: true,
  });

  // Fetch node stats
  const {
    data: nodeStats,
    error: statsError,
    loading: statsLoading,
    refresh: refreshStats,
  } = usePolling({
    fetcher: (signal?: AbortSignal) => metricsApi.getClusterNodeStats(signal),
    interval: 5000,
    enabled: true,
  });

  const { masters, replicas } = useMemo(() => {
    if (!nodes) return { masters: [], replicas: [] };

    const masters: DiscoveredNode[] = [];
    const replicas: DiscoveredNode[] = [];

    for (const node of nodes) {
      if (node.role === 'master') {
        masters.push(node);
      } else {
        replicas.push(node);
      }
    }

    return { masters, replicas };
  }, [nodes]);

  const getNodeById = useMemo(
    () => (id: string) => nodes?.find((n) => n.id === id),
    [nodes]
  );

  const getNodeStats = useMemo(
    () => (id: string) => nodeStats?.find((s) => s.nodeId === id),
    [nodeStats]
  );

  // Find imbalanced nodes (>20% deviation from mean)
  const imbalancedNodes = useMemo(() => {
    if (!nodeStats || nodeStats.length === 0) return [];

    const means = {
      memory: nodeStats.reduce((sum, n) => sum + n.memoryUsed, 0) / nodeStats.length,
      ops: nodeStats.reduce((sum, n) => sum + n.opsPerSec, 0) / nodeStats.length,
      clients: nodeStats.reduce((sum, n) => sum + n.connectedClients, 0) / nodeStats.length,
    };

    return nodeStats.filter((node) => {
      const memoryDeviation = Math.abs(node.memoryUsed - means.memory) / means.memory;
      const opsDeviation = Math.abs(node.opsPerSec - means.ops) / (means.ops || 1);
      const clientsDeviation = Math.abs(node.connectedClients - means.clients) / (means.clients || 1);

      return memoryDeviation > 0.2 || opsDeviation > 0.2 || clientsDeviation > 0.2;
    });
  }, [nodeStats]);

  const refetch = () => {
    refreshNodes();
    refreshStats();
  };

  return {
    nodes: nodes || [],
    nodeStats: nodeStats || [],
    masters,
    replicas,
    getNodeById,
    getNodeStats,
    imbalancedNodes,
    isLoading: nodesLoading || statsLoading,
    error: nodesError || statsError,
    refetch,
  };
}
