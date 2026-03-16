'use client';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CoverageIndicatorProps {
  coverage: number;
  label?: string;
}

function coverageColor(coverage: number): string {
  if (coverage > 0.8) return 'bg-green-500';
  if (coverage >= 0.5) return 'bg-yellow-500';
  return 'bg-red-500';
}

function coverageTextColor(coverage: number): string {
  if (coverage > 0.8) return 'text-green-700';
  if (coverage >= 0.5) return 'text-yellow-700';
  return 'text-red-700';
}

function coverageLevel(coverage: number): string {
  if (coverage > 0.8) return 'Alta';
  if (coverage >= 0.5) return 'Media';
  return 'Baixa';
}

export function CoverageIndicator({ coverage, label }: CoverageIndicatorProps) {
  const pct = Math.round(coverage * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          <span className="inline-flex items-center gap-1">
            <span className="relative h-2 w-12 rounded-full bg-muted overflow-hidden">
              <span
                className={cn('absolute inset-y-0 left-0 rounded-full', coverageColor(coverage))}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={cn('text-xs font-medium', coverageTextColor(coverage))}>
              {pct}%
            </span>
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="text-xs">
          Cobertura: {pct}% - {coverageLevel(coverage)}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
