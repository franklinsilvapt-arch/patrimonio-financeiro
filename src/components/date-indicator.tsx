'use client';

import { useEffect, useState } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatDate, formatDateTime, daysSince, cn } from '@/lib/utils';

interface DateIndicatorProps {
  date: Date | string | null;
  label: string;
  source?: string;
}

function freshnessColor(days: number | null): string {
  if (days === null) return 'bg-gray-400';
  if (days < 1) return 'bg-green-500';
  if (days <= 7) return 'bg-yellow-500';
  if (days <= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export function DateIndicator({ date, label, source }: DateIndicatorProps) {
  // Defer time-dependent calculations to client to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const days = mounted ? daysSince(date) : null;

  const freshnessText =
    days === null
      ? 'Data desconhecida'
      : days === 0
        ? 'Atualizado hoje'
        : days === 1
          ? 'Atualizado ha 1 dia'
          : `Atualizado ha ${days} dias`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span
            className={cn('inline-block h-2 w-2 rounded-full shrink-0', mounted ? freshnessColor(days) : 'bg-gray-400')}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{label}:</span>
          <span>{formatDate(date)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-white border shadow-md">
        <div className="space-y-1 text-xs">
          <div>{formatDateTime(date)}</div>
          <div>{freshnessText}</div>
          <div className="text-muted-foreground">Data da última importação de posições. Os valores refletem o que tinhas nessa data.</div>
          {source && <div className="text-muted-foreground">Fonte: {source}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
