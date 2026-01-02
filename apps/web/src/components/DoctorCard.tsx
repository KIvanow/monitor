import { AlertTriangle, CheckCircle } from 'lucide-react';

export interface DoctorCardProps {
  title: string;
  report: string | undefined;
  isLoading: boolean;
}

function highlightReport(report: string): string {
  return report
    .replace(
      /(High fragmentation|latency spikes?|too slow|advices? for you|blocked|blocking|WARNING|ERROR)/gi,
      '<span class="text-red-600 font-semibold">$1</span>'
    )
    .replace(
      /(CONFIG SET [^\n]+)/g,
      '<code class="bg-blue-100 text-blue-700 px-1 rounded">$1</code>'
    );
}

export function DoctorCard({ title, report, isLoading }: DoctorCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-gray-300 rounded"></div>
          <div className="h-5 w-32 bg-gray-300 rounded"></div>
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const isEmpty = !report ||
    report.includes('I have no latency reports') ||
    report.includes('Sam, I have no advice') ||
    report.trim().length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{title}</span>
        </div>
        <p className="mt-1 text-sm text-green-600">No issues detected</p>
      </div>
    );
  }

  const highlighted = highlightReport(report);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-amber-700 mb-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">{title}</span>
      </div>
      <pre
        className="mt-2 whitespace-pre-wrap text-sm text-gray-700 font-mono overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
