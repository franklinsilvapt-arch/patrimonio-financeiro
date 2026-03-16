'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PortfolioSummary } from '@/components/portfolio-summary';
import { HoldingsTable } from '@/components/holdings-table';
import { BrokerPieChart } from '@/components/charts/broker-pie-chart';
import { ExposureBarChart } from '@/components/charts/exposure-bar-chart';
import { HistoryLineChart } from '@/components/charts/history-line-chart';
import { formatPercent } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FactorRadarChart } from '@/components/charts/factor-radar-chart';
import {
  demoSummary,
  demoHoldings,
  demoBrokerAllocation,
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
          { label: 'Max drawdown', value: perf.maxDrawdown ? -perf.maxDrawdown : 0 },
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
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="sectors">Setores</TabsTrigger>
          <TabsTrigger value="factors">Fatores</TabsTrigger>
          <TabsTrigger value="currency">Cambial</TabsTrigger>
          <TabsTrigger value="holdings">Posições</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alocação por corretora</CardTitle>
              </CardHeader>
              <CardContent>
                <BrokerPieChart data={demoBrokerAllocation} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exposição por país</CardTitle>
              </CardHeader>
              <CardContent>
                <ExposureBarChart data={demoCountryExposure} title="Países" limit={10} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sectors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exposição por setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ExposureBarChart data={demoSectorExposure} title="Setores" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exposição a fatores</CardTitle>
            </CardHeader>
            <CardContent>
              <FactorRadarChart data={demoFactorScores} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exposição cambial real</CardTitle>
              <CardDescription>Moedas subjacentes dos ativos (look-through via país)</CardDescription>
            </CardHeader>
            <CardContent>
              <ExposureBarChart data={demoCurrencyExposure} title="Moedas" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holdings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Posições ({demoHoldings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <HoldingsTable holdings={demoHoldings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do património</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryLineChart data={demoHistory} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
