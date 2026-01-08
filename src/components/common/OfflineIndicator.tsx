import { useOnlineStatus, useOfflineQueue } from '@/hooks/useOffline';
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showQueueCount?: boolean;
}

export function OfflineIndicator({ className, showQueueCount = true }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const { queueLength } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!isOnline && (
        <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning">
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Offline</span>
        </Badge>
      )}
      {showQueueCount && queueLength > 0 && (
        <Badge variant="secondary" className="gap-1">
          <CloudOff className="h-3 w-3" />
          <span>{queueLength} pending</span>
        </Badge>
      )}
    </div>
  );
}

interface OfflineBannerProps {
  onSync?: () => Promise<void>;
  className?: string;
}

export function OfflineBanner({ onSync, className }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();
  const { queueLength } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  const handleSync = async () => {
    if (onSync) {
      try {
        await onSync();
        toast.success('Data synced successfully');
      } catch {
        toast.error('Failed to sync data');
      }
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border px-4 py-3',
        !isOnline ? 'border-warning/50 bg-warning/10' : 'border-info/50 bg-info/10',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <WifiOff className="h-5 w-5 text-warning" />
        ) : (
          <CloudOff className="h-5 w-5 text-info" />
        )}
        <div>
          <p className="text-sm font-medium">
            {!isOnline
              ? "You're offline"
              : `${queueLength} change${queueLength > 1 ? 's' : ''} pending sync`}
          </p>
          <p className="text-xs text-muted-foreground">
            {!isOnline
              ? 'Changes will be saved when you reconnect'
              : 'Click sync to upload your changes'}
          </p>
        </div>
      </div>
      {isOnline && queueLength > 0 && onSync && (
        <Button size="sm" variant="outline" onClick={handleSync}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Now
        </Button>
      )}
    </div>
  );
}

export function CacheIndicator({ isFromCache }: { isFromCache: boolean }) {
  if (!isFromCache) return null;

  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <CloudOff className="h-3 w-3" />
      Cached
    </Badge>
  );
}