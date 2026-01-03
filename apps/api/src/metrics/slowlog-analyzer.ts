import {
  SlowLogEntry,
  SlowLogPatternAnalysis,
  SlowLogPatternStats,
  CommandBreakdown,
  KeyPrefixBreakdown,
} from '../common/types/metrics.types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_REGEX = /^\d+$/;
const LONG_ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]{20,}$/;

export function extractKeyPattern(key: string): string {
  if (!key || key.length === 0) return key;

  const delimiter = key.includes(':')
    ? ':'
    : key.includes('/')
      ? '/'
      : null;

  if (!delimiter) {
    // No delimiter - check if entire key is dynamic
    if (
      NUMERIC_REGEX.test(key) ||
      UUID_REGEX.test(key) ||
      LONG_ALPHANUMERIC_REGEX.test(key)
    ) {
      return '*';
    }
    return key;
  }

  const segments = key.split(delimiter);
  const patternSegments = segments.map((segment) => {
    if (NUMERIC_REGEX.test(segment)) return '*';
    if (UUID_REGEX.test(segment)) return '*';
    if (LONG_ALPHANUMERIC_REGEX.test(segment)) return '*';
    // Short hex strings that look like IDs (e.g., "a1b2c3d4")
    if (/^[0-9a-f]{6,}$/i.test(segment) && segment.length >= 6) return '*';
    return segment;
  });

  return patternSegments.join(delimiter);
}

export function createPatternKey(
  command: string,
  keyPattern: string | null,
): string {
  return keyPattern ? `${command} ${keyPattern}` : command;
}

export function analyzeSlowLogPatterns(
  entries: SlowLogEntry[],
): SlowLogPatternAnalysis {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      analyzedAt: Date.now(),
      patterns: [],
      byCommand: [],
      byKeyPrefix: [],
    };
  }

  const patternMap = new Map<
    string,
    {
      command: string;
      keyPattern: string;
      entries: SlowLogEntry[];
    }
  >();

  const commandMap = new Map<string, SlowLogEntry[]>();
  const prefixMap = new Map<string, SlowLogEntry[]>();

  for (const entry of entries) {
    const command = entry.command[0]?.toUpperCase() || 'UNKNOWN';
    const key = entry.command[1] || null;
    const keyPattern = key ? extractKeyPattern(key) : '(no key)';
    const patternKey = createPatternKey(command, keyPattern);

    // Aggregate by full pattern
    if (!patternMap.has(patternKey)) {
      patternMap.set(patternKey, { command, keyPattern, entries: [] });
    }
    patternMap.get(patternKey)!.entries.push(entry);

    // Aggregate by command
    if (!commandMap.has(command)) {
      commandMap.set(command, []);
    }
    commandMap.get(command)!.push(entry);

    // Aggregate by key prefix (first segment before delimiter)
    if (key) {
      const prefix = key.split(/[:/]/)[0] + ':';
      if (!prefixMap.has(prefix)) {
        prefixMap.set(prefix, []);
      }
      prefixMap.get(prefix)!.push(entry);
    }
  }

  const totalEntries = entries.length;

  // Build pattern stats
  const patterns: SlowLogPatternStats[] = Array.from(patternMap.entries())
    .map(([pattern, data]) => {
      const durations = data.entries.map((e) => e.duration);
      const totalDuration = durations.reduce((a, b) => a + b, 0);

      return {
        pattern,
        command: data.command,
        keyPattern: data.keyPattern,
        count: data.entries.length,
        percentage: (data.entries.length / totalEntries) * 100,
        totalDuration,
        avgDuration: totalDuration / data.entries.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        examples: data.entries.slice(0, 3).map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          duration: e.duration,
          fullCommand: e.command,
          clientAddress: e.clientAddress,
        })),
      };
    })
    .sort((a, b) => b.count - a.count);

  // Build command breakdown
  const byCommand: CommandBreakdown[] = Array.from(commandMap.entries())
    .map(([command, cmdEntries]) => ({
      command,
      count: cmdEntries.length,
      percentage: (cmdEntries.length / totalEntries) * 100,
      avgDuration:
        cmdEntries.reduce((a, e) => a + e.duration, 0) / cmdEntries.length,
    }))
    .sort((a, b) => b.count - a.count);

  // Build key prefix breakdown
  const byKeyPrefix: KeyPrefixBreakdown[] = Array.from(prefixMap.entries())
    .map(([prefix, prefixEntries]) => ({
      prefix,
      count: prefixEntries.length,
      percentage: (prefixEntries.length / totalEntries) * 100,
      avgDuration:
        prefixEntries.reduce((a, e) => a + e.duration, 0) /
        prefixEntries.length,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEntries,
    analyzedAt: Date.now(),
    patterns,
    byCommand,
    byKeyPrefix,
  };
}
