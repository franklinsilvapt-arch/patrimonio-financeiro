'use client';

import { Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { DateIndicator } from '@/components/date-indicator';
import { formatCurrency, formatPercent } from '@/lib/utils';

export interface PortfolioSummaryData {
  totalValue: number;
  currency: string;
  uniqueSecurities: number;
  brokerCount: number;
  averageCoverage: number;
  lastUpdate: string | null;
  lastUpdateSource?: string;
}

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData;
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  return (
    <TooltipProvider>
      <div className="space-y-1">
        {/* Desktop: 4 equal cards in a row */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(summary.totalValue, summary.currency)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nr. ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums">{summary.uniqueSecurities}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nr. corretoras/bancos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums">{summary.brokerCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                Cobertura média
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs bg-white border shadow-md">
                    Percentagem média dos dados de exposição geográfica e setorial disponíveis para os teus ativos (via JustETF). 100% significa que todos os ETFs têm dados completos de país e setor. Posições sem dados (como cash ou ações individuais) reduzem esta percentagem.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums">{formatPercent(summary.averageCoverage)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile: valor total prominent + 3 compact cards */}
        <div className="sm:hidden space-y-2">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs font-medium text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(summary.totalValue, summary.currency)}
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <p className="text-xs font-medium text-muted-foreground">Ativos</p>
                <p className="text-lg font-semibold tabular-nums">{summary.uniqueSecurities}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <p className="text-xs font-medium text-muted-foreground">Corretoras</p>
                <p className="text-lg font-semibold tabular-nums">{summary.brokerCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  Cobertura
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs bg-white border shadow-md">
                      Percentagem média dos dados de exposição geográfica e setorial disponíveis para os teus ativos (via JustETF). 100% significa que todos os ETFs têm dados completos de país e setor. Posições sem dados (como cash ou ações individuais) reduzem esta percentagem.
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className="text-lg font-semibold tabular-nums">{formatPercent(summary.averageCoverage)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Single date indicator for all cards */}
        <div>
          <DateIndicator
            date={summary.lastUpdate}
            label="Atualizado"
            source={summary.lastUpdateSource}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
