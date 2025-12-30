import { Badge } from '../ui/badge';
import { useCapabilities } from '../../hooks/useCapabilities';

export function CapabilitiesBadges() {
  const { capabilities, isValkey, hasCommandLog, hasClusterSlotStats } = useCapabilities();

  if (!capabilities) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={isValkey ? 'default' : 'secondary'}>
        {capabilities.dbType} {capabilities.version}
      </Badge>
      {hasCommandLog && <Badge variant="outline">COMMANDLOG</Badge>}
      {hasClusterSlotStats && <Badge variant="outline">SLOT-STATS</Badge>}
    </div>
  );
}
