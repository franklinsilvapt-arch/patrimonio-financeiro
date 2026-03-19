'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PortfolioSummary } from '@/components/portfolio-summary';
import { HoldingsTable } from '@/components/holdings-table';
import { BrokerPieChart } from '@/components/charts/broker-pie-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { ExposureBarChart } from '@/components/charts/exposure-bar-chart';
import { HistoryLineChart } from '@/components/charts/history-line-chart';
import { formatPercent } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FactorRadarChart } from '@/components/charts/factor-radar-chart';
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

const returnColor = (v: number | null) => {
  if (v === null) return 'text-muted-foreground';
  return v >= 0 ? 'text-green-600' : 'text-red-600';
};

const returnSign = (v: number | null) => {
  if (v === null) return '--';
  return (v >= 0 ? '+' : '') + formatPercent(v);
};

export default function DemoPage() {
  const perf = demoPerformance;

  return (
    <div className="space-y-6">
      <PortfolioSummary summary={demoSummary} />

      {/* Performance metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'TWR', value: perf.ttwror, tooltip: 'Time-Weighted Return — mede a rentabilidade real do portfolio, eliminando o efeito de depósitos e levantamentos.' },
          { label: 'Anualizado', value: perf.annualizedReturn },
          { label: '1 mês', value: perf.periodReturns['1m'] },
          { label: '3 meses', value: perf.periodReturns['3m'] },
          { label: 'YTD', value: perf.periodReturns.ytd },
          { label: 'Max drawdown', value: perf.maxDrawdown ? -perf.maxDrawdown : 0, tooltip: 'Maximum Drawdown — a maior queda percentual do portfolio desde um pico até ao ponto mais baixo seguinte. Exemplo: se o portfolio subiu a 100k€ e depois desceu a 90k€, o drawdown foi de -10%.' },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-baseline justify-between gap-2">
                {'tooltip' in m && m.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-medium text-muted-foreground underline decoration-dotted cursor-help">{m.label}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{m.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                )}
                <span className={`text-sm font-bold tabular-nums ${returnColor(m.value)}`}>
                  {returnSign(m.value)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
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
