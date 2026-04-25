import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStatusBadgeProps {
  className?: string;
}

export const NetworkStatusBadge = ({ className }: NetworkStatusBadgeProps) => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(window.navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Badge
      aria-live="polite"
      className={cn(
        'border-0 gap-1.5 font-medium',
        isOnline
          ? 'bg-emerald-500/15 text-emerald-100'
          : 'bg-amber-500/20 text-amber-50',
        className,
      )}
    >
      {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
};