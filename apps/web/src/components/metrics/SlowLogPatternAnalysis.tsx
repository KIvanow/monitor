import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { SlowLogPatternAnalysis } from '../../types/metrics';

interface Props {
  analysis: SlowLogPatternAnalysis;
}

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export function SlowLogPatternAnalysisView({ analysis }: Props) {
  const formatDuration = (us: number) => {
    if (us < 1000) return `${us.toFixed(0)}µs`;
    if (us < 1000000) return `${(us / 1000).toFixed(1)}ms`;
    return `${(us / 1000000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{analysis.totalEntries}</div>
            <div className="text-sm text-muted-foreground">
              Total Slow Queries
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{analysis.patterns.length}</div>
            <div className="text-sm text-muted-foreground">
              Unique Patterns
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {analysis.byCommand.length}
            </div>
            <div className="text-sm text-muted-foreground">Command Types</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pattern Insight Banner */}
      {analysis.patterns.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-lg font-semibold">
              {analysis.patterns[0].pattern} accounts for{' '}
              {analysis.patterns[0].percentage.toFixed(1)}% of slow queries
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Average duration: {formatDuration(analysis.patterns[0].avgDuration)}{' '}
              • {analysis.patterns[0].count} occurrences
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Distribution Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.patterns.slice(0, 8).map((pattern, i) => (
              <div key={pattern.pattern} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {pattern.pattern}
                  </span>
                  <span className="font-semibold">
                    {pattern.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${pattern.percentage}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {pattern.count} queries • avg{' '}
                  {formatDuration(pattern.avgDuration)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Command Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>By Command</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {analysis.byCommand.slice(0, 10).map((cmd) => (
              <div
                key={cmd.command}
                className="px-3 py-2 bg-muted rounded-lg text-sm"
              >
                <span className="font-mono font-semibold">{cmd.command}</span>
                <span className="text-muted-foreground ml-2">
                  {cmd.percentage.toFixed(1)}% ({cmd.count})
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  avg {formatDuration(cmd.avgDuration)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Prefix Breakdown */}
      {analysis.byKeyPrefix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Key Prefix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {analysis.byKeyPrefix.slice(0, 10).map((prefix) => (
                <div
                  key={prefix.prefix}
                  className="px-3 py-2 bg-muted rounded-lg text-sm"
                >
                  <span className="font-mono font-semibold">
                    {prefix.prefix}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {prefix.percentage.toFixed(1)}% ({prefix.count})
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    avg {formatDuration(prefix.avgDuration)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Pattern Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pattern</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Avg Duration</TableHead>
                <TableHead className="text-right">Max Duration</TableHead>
                <TableHead className="text-right">Total Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.patterns.map((pattern, i) => (
                <TableRow key={pattern.pattern}>
                  <TableCell className="font-mono text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      {pattern.pattern}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{pattern.count}</TableCell>
                  <TableCell className="text-right">
                    {pattern.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(pattern.avgDuration)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(pattern.maxDuration)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(pattern.totalDuration)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
