import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { SlowLogEntry } from '../../types/metrics';

interface Props {
  entries: SlowLogEntry[];
}

export function SlowLogTable({ entries }: Props) {
  const formatDuration = (us: number) => {
    if (us < 1000) return `${us}µs`;
    if (us < 1000000) return `${(us / 1000).toFixed(2)}ms`;
    return `${(us / 1000000).toFixed(2)}s`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Command</TableHead>
          <TableHead>Client</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-mono">{entry.id}</TableCell>
            <TableCell>{formatTime(entry.timestamp)}</TableCell>
            <TableCell className="font-mono">{formatDuration(entry.duration)}</TableCell>
            <TableCell className="font-mono text-sm max-w-md truncate">
              {entry.command.join(' ')}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {entry.clientName || entry.clientAddress}
            </TableCell>
          </TableRow>
        ))}
        {entries.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No slow log entries
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
