export const CLUSTER_TOTAL_SLOTS = 16384;
export const CLUSTER_GRID_SIZE = 128; // 128x128 = 16384 slots
// https://valkey.io/topics/cluster-spec/
// https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/


export interface ClusterHealth {
  status: 'healthy' | 'degraded' | 'failing';
  slotsOk: number;
  slotsFail: number;
  slotsPfail: number;
  slotsAssigned: number;
  totalSlots: typeof CLUSTER_TOTAL_SLOTS;
}

// Re-export from metrics for convenience
export type { ClusterNode, SlotStatsMetric, SlotStats } from './metrics';

// Utility functions for cluster operations
export function formatSlotRanges(slots: number[][]): string {
  return slots
    .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
    .join(', ');
}

export function countSlots(slots: number[][]): number {
  return slots.reduce((sum, [start, end]) => sum + (end - start + 1), 0);
}

export function buildSlotNodeMap(nodes: import('./metrics').ClusterNode[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const node of nodes) {
    if (node.flags.includes('master')) {
      for (const [start, end] of node.slots) {
        for (let slot = start; slot <= end; slot++) {
          map.set(slot, node.id);
        }
      }
    }
  }
  return map;
}
