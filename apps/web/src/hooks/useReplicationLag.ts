import { useMemo } from 'react';
import { useClusterNodes } from './useClusterNodes';
import type { ReplicationLagInfo } from '../types/cluster';

export function useReplicationLag() {
  const { nodes, nodeStats } = useClusterNodes();

  const lagData = useMemo<ReplicationLagInfo[]>(() => {
    if (!nodes || !nodeStats || nodes.length === 0 || nodeStats.length === 0) {
      return [];
    }

    const result: ReplicationLagInfo[] = [];

    // Find all replicas and calculate their lag
    const replicas = nodes.filter((n) => n.role === 'replica');

    for (const replica of replicas) {
      const replicaStats = nodeStats.find((s) => s.nodeId === replica.id);
      if (!replicaStats || !replica.masterId) continue;

      // Find the master node
      const master = nodes.find((n) => n.id === replica.masterId);
      if (!master) continue;

      const masterStats = nodeStats.find((s) => s.nodeId === master.id);
      if (!masterStats) continue;

      // Calculate offset difference
      const masterOffset = masterStats.replicationOffset || 0;
      const replicaOffset = replicaStats.replicationOffset || 0;
      const offsetDiff = masterOffset - replicaOffset;

      // Get lag in milliseconds from master_last_io_seconds_ago
      const lagMs = (replicaStats.masterLastIoSecondsAgo || 0) * 1000;

      // Determine link status
      const linkStatus: 'up' | 'down' =
        replicaStats.masterLinkStatus === 'up' ? 'up' : 'down';

      // Determine lag status
      let status: ReplicationLagInfo['status'];
      if (linkStatus === 'down') {
        status = 'disconnected';
      } else if (offsetDiff === 0) {
        status = 'in-sync';
      } else if (offsetDiff < 1000 && lagMs < 100) {
        status = 'slight-lag';
      } else {
        status = 'lagging';
      }

      result.push({
        masterId: master.id,
        masterAddress: master.address,
        replicaId: replica.id,
        replicaAddress: replica.address,
        offsetDiff,
        lagMs,
        linkStatus,
        status,
      });
    }

    return result;
  }, [nodes, nodeStats]);

  const hasLaggingReplicas = useMemo(
    () => lagData.some((l) => l.status === 'lagging' || l.status === 'disconnected'),
    [lagData]
  );

  const maxLagMs = useMemo(() => {
    if (lagData.length === 0) return 0;
    return Math.max(...lagData.map((l) => l.lagMs));
  }, [lagData]);

  const maxOffsetDiff = useMemo(() => {
    if (lagData.length === 0) return 0;
    return Math.max(...lagData.map((l) => l.offsetDiff));
  }, [lagData]);

  return {
    lagData,
    hasLaggingReplicas,
    maxLagMs,
    maxOffsetDiff,
  };
}
