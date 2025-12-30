import { useSearchParams } from 'react-router-dom';
import { metricsApi } from '../api/metrics';
import { usePolling } from '../hooks/usePolling';
import { useCapabilities } from '../hooks/useCapabilities';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { SlowLogTable } from '../components/metrics/SlowLogTable';
import { CommandLogTable } from '../components/metrics/CommandLogTable';
import type { CommandLogType } from '../types/metrics';

function getTabFromParams(params: URLSearchParams): CommandLogType {
  const tab = params.get('tab');
  if (tab === 'large-request' || tab === 'large-reply') {
    return tab;
  }
  return 'slow';
}

export function SlowLog() {
  const { hasCommandLog } = useCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = getTabFromParams(searchParams);

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Slow Log</h1>

      {hasCommandLog ? (
        <Card>
          <CardHeader>
            <CardTitle>Command Log (Valkey)</CardTitle>
          </CardHeader>
          <CardContent>
            <CommandLogTable
              entries={{
                slow: commandLogSlow || [],
                'large-request': commandLogLargeRequest || [],
                'large-reply': commandLogLargeReply || [],
              }}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Slow Log (Redis)</CardTitle>
          </CardHeader>
          <CardContent>
            <SlowLogTable entries={slowLog || []} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
