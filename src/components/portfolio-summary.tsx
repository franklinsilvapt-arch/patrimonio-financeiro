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
  monthlyChange?: number | null;
}

export function PortfolioSummary({ summary, monthlyChange }: PortfolioSummaryProps) {
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
            {monthlyChange != null && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  monthlyChange >= 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {monthlyChange >= 0 ? '+' : ''}{formatPercent(monthlyChange)}
                </span>
                <span className="text-xs text-slate-400">vs. último mês</span>
              </div>
            )}
          </div>

          {/* Nr. ativos */}
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Nr. ativos</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {summary.uniqueSecurities}
            </h2>
            <div className="mt-3 flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span className="text-xs">Ativos diversificados</span>
            </div>
          </div>

          {/* Nr. corretoras */}
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Nr. corretoras/bancos</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {summary.brokerCount}
            </h2>
            <div className="mt-3 flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
              <span className="text-xs">Instituições conectadas</span>
            </div>
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
