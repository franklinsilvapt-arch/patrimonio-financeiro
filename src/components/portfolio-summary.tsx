'use client';

import { Info } from 'lucide-react';
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
  const coveragePct = Math.round(summary.averageCoverage * 100);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Valor total */}
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Valor total</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {formatCurrency(summary.totalValue, summary.currency)}
            </h2>
          </div>

          {/* Nr. ativos */}
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Nr. ativos</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {summary.uniqueSecurities}
            </h2>
          </div>

          {/* Nr. corretoras */}
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Nr. corretoras/bancos</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {summary.brokerCount}
            </h2>
          </div>

          {/* Cobertura */}
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-1">
              Cobertura média
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs bg-white border shadow-md">
                  Percentagem média dos dados de exposição geográfica e setorial disponíveis para os teus ativos (via JustETF). 100% significa que todos os ETFs têm dados completos de país e setor. Posições sem dados (como cash ou ações individuais) reduzem esta percentagem.
                </TooltipContent>
              </Tooltip>
            </p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {formatPercent(summary.averageCoverage)}
            </h2>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-600 h-full transition-all" style={{ width: `${coveragePct}%` }} />
            </div>
          </div>
        </div>

        <DateIndicator
          date={summary.lastUpdate}
          label="Atualizado"
          source={summary.lastUpdateSource}
        />
      </div>
    </TooltipProvider>
  );
}
