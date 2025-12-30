import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import type { ClientInfo } from '../../types/metrics';

interface Props {
  clients: ClientInfo[];
}

export function ClientsTable({ clients }: Props) {
  const formatAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Idle</TableHead>
          <TableHead>DB</TableHead>
          <TableHead>Last Cmd</TableHead>
          <TableHead>Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-mono">{client.id}</TableCell>
            <TableCell className="font-mono">{client.addr}</TableCell>
            <TableCell>{client.name || '-'}</TableCell>
            <TableCell>{formatAge(client.age)}</TableCell>
            <TableCell>{formatAge(client.idle)}</TableCell>
            <TableCell>{client.db}</TableCell>
            <TableCell className="font-mono">{client.cmd}</TableCell>
            <TableCell>
              <Badge variant="outline">{client.flags}</Badge>
            </TableCell>
          </TableRow>
        ))}
        {clients.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              No connected clients
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
