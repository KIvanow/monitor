import { useState, useEffect } from 'react';
import { metricsApi } from '../api/metrics';
import { usePolling } from '../hooks/usePolling';
import { ConnectionCard } from '../components/dashboard/ConnectionCard';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { MemoryChart } from '../components/dashboard/MemoryChart';
import { OpsChart } from '../components/dashboard/OpsChart';
import { CapabilitiesBadges } from '../components/dashboard/CapabilitiesBadges';
import { DoctorCard } from '../components/DoctorCard';

export function Dashboard() {
  const { data: health, loading: healthLoading } = usePolling({
    fetcher: metricsApi.getHealth,
    interval: 5000,
  });

  const { data: info } = usePolling({
    fetcher: metricsApi.getInfo,
    interval: 5000,
  });

  const [memoryHistory, setMemoryHistory] = useState<Array<{ time: string; used: number; peak: number }>>([]);
  const [opsHistory, setOpsHistory] = useState<Array<{ time: string; ops: number }>>([]);
  const [memoryDoctorReport, setMemoryDoctorReport] = useState<string>();
  const [memoryDoctorLoading, setMemoryDoctorLoading] = useState(true);

  useEffect(() => {
    if (!info?.memory || !info?.stats) return;

    const time = new Date().toLocaleTimeString();

    setMemoryHistory((prev) => {
      const next = [...prev, {
        time,
        used: parseInt(info.memory!.used_memory, 10),
        peak: parseInt(info.memory!.used_memory_peak, 10)
      }];
      return next.slice(-60);
    });

    setOpsHistory((prev) => {
      const next = [...prev, { time, ops: parseInt(info.stats!.instantaneous_ops_per_sec, 10) }];
      return next.slice(-60);
    });
  }, [info]);

  useEffect(() => {
    metricsApi.getMemoryDoctor()
      .then(data => setMemoryDoctorReport(data.report))
      .catch(console.error)
      .finally(() => setMemoryDoctorLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <CapabilitiesBadges />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <ConnectionCard health={health} loading={healthLoading} />
        <OverviewCards info={info} />
      </div>

      <DoctorCard
        title="Memory Doctor"
        report={memoryDoctorReport}
        isLoading={memoryDoctorLoading}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MemoryChart data={memoryHistory} />
        <OpsChart data={opsHistory} />
      </div>
    </div>
  );
}
