export interface SlowLogPatternExample {
  id: number;
  timestamp: number;
  duration: number;
  fullCommand: string[];
  clientAddress: string;
}

export interface SlowLogPatternStats {
  pattern: string;
  command: string;
  keyPattern: string;
  count: number;
  percentage: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  examples: SlowLogPatternExample[];
}

export interface CommandBreakdown {
  command: string;
  count: number;
  percentage: number;
  avgDuration: number;
}

export interface KeyPrefixBreakdown {
  prefix: string;
  count: number;
  percentage: number;
  avgDuration: number;
}

export interface SlowLogPatternAnalysis {
  totalEntries: number;
  analyzedAt: number;
  patterns: SlowLogPatternStats[];
  byCommand: CommandBreakdown[];
  byKeyPrefix: KeyPrefixBreakdown[];
}
