import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
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

  const buildAuditUrl = (client: ClientInfo) => {
    if (!client.addr) return null;
    const ip = client.addr.split(':')[0];
    return `/audit?ip=${encodeURIComponent(ip)}`;
  };

  const buildSlowLogUrl = (client: ClientInfo) => {
    const params = new URLSearchParams();
    if (client.name) params.set('client', client.name);
    else if (client.addr) params.set('client', client.addr);
    return `/slowlog?${params.toString()}`;
  };

  return (
    <>
    <Tooltip id="audit-tooltip" style={{ zIndex: 9999 }} />
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
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          return (
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
              <TableCell>
                <div className="flex gap-1">
                  <Link
                    to={buildSlowLogUrl(client)}
                    className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Slow Log
                  </Link>
                  {buildAuditUrl(client) && (
                    <Link
                      to={buildAuditUrl(client)!}
                      className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80"
                      data-tooltip-id="audit-tooltip"
                      data-tooltip-content="Filter by IP address"
                    >
                      Audit
                    </Link>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {clients.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground">
              No connected clients
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    </>
  );
}
