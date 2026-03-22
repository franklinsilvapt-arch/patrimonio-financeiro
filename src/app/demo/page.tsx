'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PortfolioSummary } from '@/components/portfolio-summary';
import { HoldingsTable } from '@/components/holdings-table';
import { DonutChart } from '@/components/charts/donut-chart';
import { ExposureBarChart } from '@/components/charts/exposure-bar-chart';
import { HistoryLineChart } from '@/components/charts/history-line-chart';
import { FactorRadarChart } from '@/components/charts/factor-radar-chart';
import { formatPercent } from '@/lib/utils';
import {
  demoSummary,
  demoHoldings,
  demoBrokerAllocation,
  demoAssetClassAllocation,
  demoCountryExposure,
  demoSectorExposure,
  demoFactorScores,
  demoCurrencyExposure,
  demoHistory,
  demoPerformance,
} from '@/lib/demo-data';

const returnSign = (v: number | null) => {
  if (v === null) return '--';
  return (v >= 0 ? '+' : '') + formatPercent(v);
};

export default function DemoPage() {
  const perf = demoPerformance;

  return (
    <div className="space-y-6">
      <PortfolioSummary summary={demoSummary} monthlyChange={perf.periodReturns['1m']} />

      {/* Scope toggle + Performance pill */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button className="px-4 py-1.5 text-sm font-semibold rounded-md bg-white shadow-sm text-black">Tudo</button>
          <button className="px-4 py-1.5 text-sm font-medium text-slate-500">Pessoal</button>
          <button className="px-4 py-1.5 text-sm font-medium text-slate-500">Empresarial</button>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center bg-slate-200 px-4 py-2 rounded-lg gap-3">
            {[
              { label: 'RETORNO TOTAL', value: perf.ttwror, bold: true },
              { label: 'YTD', value: perf.periodReturns.ytd },
              { label: 'Drawdown', value: perf.maxDrawdown ? -perf.maxDrawdown : 0 },
            ].map((m, i, arr) => (
              <div key={m.label} className="flex items-center gap-2">
                <span className={`text-xs text-slate-600 ${m.bold ? 'font-bold uppercase tracking-widest' : 'font-medium'}`}>{m.label}</span>
                <span className={`text-sm font-bold tabular-nums ${
                  m.value === null ? 'text-slate-500' :
                  m.label === 'Drawdown' ? 'text-red-600' :
                  (m.value ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {returnSign(m.value)}
                </span>
                {i < arr.length - 1 && <div className="w-px h-4 bg-slate-300 ml-1" />}
              </div>
            ))}
          </div>
          <div className="flex items-center bg-white border border-slate-200 px-4 py-2 rounded-lg gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase">EUR/USD</span>
            <span className="text-sm font-bold text-black tabular-nums">1.08</span>
          </div>
        </div>
      </div>

      {/* Filters (static for demo) */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-4">
        <select className="h-10 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600">
          <option>Corretora/banco</option>
        </select>
        <select className="h-10 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600">
          <option>Classe</option>
        </select>
        <select className="h-10 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600">
          <option>Moeda</option>
        </select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Geral</TabsTrigger>
          <TabsTrigger value="countries">Países</TabsTrigger>
          <TabsTrigger value="sectors">Setores</TabsTrigger>
          <TabsTrigger value="factors">Fatores</TabsTrigger>
          <TabsTrigger value="currency">Cambial</TabsTrigger>
          <TabsTrigger value="holdings">Posições</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
              <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-8">Alocação por corretora</h3>
              <DonutChart data={demoBrokerAllocation} colorScheme="slate" />
            </div>
            <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
              <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-8">Alocação por tipo de ativo</h3>
              <DonutChart data={demoAssetClassAllocation} colorScheme="green" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="countries">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Exposição por país</h3>
            <ExposureBarChart data={demoCountryExposure} title="Países" limit={10} />
          </div>
        </TabsContent>

        <TabsContent value="sectors">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Exposição por setor</h3>
            <ExposureBarChart data={demoSectorExposure} title="Setores" />
          </div>
        </TabsContent>

        <TabsContent value="factors">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Exposição a fatores</h3>
            <FactorRadarChart data={demoFactorScores} />
          </div>
        </TabsContent>

        <TabsContent value="currency">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-1">Exposição cambial real</h3>
            <p className="text-sm text-slate-500 mb-6">Moedas subjacentes dos ativos (look-through via país)</p>
            <ExposureBarChart data={demoCurrencyExposure} title="Moedas" />
          </div>
        </TabsContent>

        <TabsContent value="holdings">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Posições ({demoHoldings.length})</h3>
            <HoldingsTable holdings={demoHoldings} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Evolução do património</h3>
            <HistoryLineChart data={demoHistory} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
