import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { metricsApi } from '../api/metrics';
import { usePolling } from '../hooks/usePolling';
import { useCapabilities } from '../hooks/useCapabilities';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { SlowLogTable } from '../components/metrics/SlowLogTable';
import { CommandLogTable } from '../components/metrics/CommandLogTable';
import { SlowLogPatternAnalysisView } from '../components/metrics/SlowLogPatternAnalysis';
import type { CommandLogType } from '../types/metrics';

function getTabFromParams(params: URLSearchParams): CommandLogType {
  const tab = params.get('tab');
  if (tab === 'large-request' || tab === 'large-reply') {
    return tab;
  }
  return 'slow';
}

function filterByClient<T extends { clientName: string; clientAddress: string }>(
  entries: T[],
  clientFilter: string | null
): T[] {
  if (!clientFilter) return entries;
  const filter = clientFilter.toLowerCase();
  return entries.filter(
    (e) =>
      e.clientName?.toLowerCase().includes(filter) ||
      e.clientAddress?.toLowerCase().includes(filter)
  );
}

export function SlowLog() {
  const { hasCommandLog, capabilities } = useCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = getTabFromParams(searchParams);
  const clientFilter = searchParams.get('client');
  const [viewMode, setViewMode] = useState<'table' | 'patterns'>('table');

  const handleTabChange = (newTab: CommandLogType) => {
    if (newTab === 'slow') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', newTab);
    }
    setSearchParams(searchParams);
  };

  const { data: slowLog } = usePolling({
    fetcher: () => metricsApi.getSlowLog(100),
    interval: 10000,
    enabled: !hasCommandLog,
  });

  const { data: commandLogSlow } = usePolling({
    fetcher: () => metricsApi.getCommandLog(100, 'slow'),
    interval: 10000,
    enabled: hasCommandLog && activeTab === 'slow',
  });

  const { data: commandLogLargeRequest } = usePolling({
    fetcher: () => metricsApi.getCommandLog(100, 'large-request'),
    interval: 10000,
    enabled: hasCommandLog && activeTab === 'large-request',
  });

  const { data: commandLogLargeReply } = usePolling({
    fetcher: () => metricsApi.getCommandLog(100, 'large-reply'),
    interval: 10000,
    enabled: hasCommandLog && activeTab === 'large-reply',
  });

  // Pattern analysis (less frequent polling since it's analytical)
  const { data: slowLogPatternAnalysis } = usePolling({
    fetcher: () => metricsApi.getSlowLogPatternAnalysis(128),
    interval: 30000,
    enabled: !hasCommandLog && viewMode === 'patterns',
  });

  const { data: commandLogPatternAnalysis } = usePolling({
    fetcher: () =>
      metricsApi.getCommandLogPatternAnalysis(128, activeTab),
    interval: 30000,
    enabled: hasCommandLog && viewMode === 'patterns',
  });

  const filteredSlowLog = useMemo(
    () => filterByClient(slowLog || [], clientFilter),
    [slowLog, clientFilter]
  );

  const filteredCommandLogSlow = useMemo(
    () => filterByClient(commandLogSlow || [], clientFilter),
    [commandLogSlow, clientFilter]
  );

  const filteredCommandLogLargeRequest = useMemo(
    () => filterByClient(commandLogLargeRequest || [], clientFilter),
    [commandLogLargeRequest, clientFilter]
  );

  const filteredCommandLogLargeReply = useMemo(
    () => filterByClient(commandLogLargeReply || [], clientFilter),
    [commandLogLargeReply, clientFilter]
  );

  const clearClientFilter = () => {
    searchParams.delete('client');
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Slow Log</h1>
        {clientFilter && (
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded">
            <span className="text-sm">
              Filtered by: <span className="font-mono">{clientFilter}</span>
            </span>
            <button
              onClick={clearClientFilter}
              className="text-xs px-2 py-0.5 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {hasCommandLog ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Command Log (Valkey)</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('patterns')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'patterns'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Pattern Analysis
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'patterns' && commandLogPatternAnalysis ? (
              <SlowLogPatternAnalysisView
                analysis={commandLogPatternAnalysis}
              />
            ) : (
              <CommandLogTable
                entries={{
                  slow: filteredCommandLogSlow,
                  'large-request': filteredCommandLogLargeRequest,
                  'large-reply': filteredCommandLogLargeReply,
                }}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>
              Slow Log ({capabilities?.dbType === 'valkey' ? 'Valkey' : 'Redis'})
            </CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('patterns')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'patterns'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Pattern Analysis
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'patterns' && slowLogPatternAnalysis ? (
              <SlowLogPatternAnalysisView analysis={slowLogPatternAnalysis} />
            ) : (
              <SlowLogTable entries={filteredSlowLog} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
