export interface StoredClientSnapshot {
  id: number;
  clientId: string;
  addr: string;
  name: string;
  user: string;
  db: number;
  cmd: string;
  age: number;
  idle: number;
  flags: string;
  sub: number;
  psub: number;
  qbuf: number;
  qbufFree: number;
  obl: number;
  oll: number;
  omem: number;
  capturedAt: number;
  sourceHost: string;
  sourcePort: number;
}

export interface ClientSnapshotQueryOptions {
  clientName?: string;
  user?: string;
  addr?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface ClientTimeSeriesPoint {
  timestamp: number;
  totalConnections: number;
  byName: Record<string, number>;
  byUser: Record<string, number>;
  byAddr: Record<string, number>;
}

export interface ClientAnalyticsStats {
  currentConnections: number;
  peakConnections: number;
  peakTimestamp: number;
  uniqueClientNames: number;
  uniqueUsers: number;
  uniqueIps: number;
  connectionsByName: Record<string, { current: number; peak: number; avgAge: number }>;
  connectionsByUser: Record<string, { current: number; peak: number }>;
  connectionsByUserAndName: Record<string, { user: string; name: string; current: number; peak: number; avgAge: number }>;
  timeRange: { earliest: number; latest: number } | null;
}
