'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PortfolioSummary, type PortfolioSummaryData } from '@/components/portfolio-summary';
import { FilterBar } from '@/components/filter-bar';
import { HoldingsTable, type HoldingRow } from '@/components/holdings-table';
import { BrokerPieChart } from '@/components/charts/broker-pie-chart';
import { ExposureBarChart } from '@/components/charts/exposure-bar-chart';
import { HistoryLineChart } from '@/components/charts/history-line-chart';
import { FactorRadarChart } from '@/components/charts/factor-radar-chart';
import { CorrelationMatrix } from '@/components/charts/correlation-matrix';
import { formatPercent, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortfolioApiResponse {
  summary: PortfolioSummaryData;
  holdings: HoldingRow[];
  brokerAllocation: Array<{ name: string; value: number }>;
  countryExposure: Array<{ name: string; value: number }>;
  sectorExposure: Array<{ name: string; value: number }>;
  factorScores: Array<{ factor: string; score: number; fullMark?: number }>;
  history: Array<{ date: string; value: number; [broker: string]: number | string }>;
  brokerNames: string[];
}

interface PerformanceData {
  ttwror: number | null;
  annualizedReturn: number | null;
  maxDrawdown: number;
  volatility: number | null;
  periodReturns: Record<string, number | null>;
  periodDates?: Record<string, string>;
  snapshotCount: number;
  firstDate?: string;
  lastDate?: string;
}

interface AnalyticsData {
  concentration: {
    hhiByPosition: number;
    hhiByBroker: number;
    effectivePositions: number;
    effectiveBrokers: number;
    topPositions: Array<{ name: string; weight: number }>;
    positionCount: number;
  };
  currencyExposure: Array<{ name: string; value: number }>;
  correlation: {
    assets: string[];
    matrix: Array<{ asset1: string; asset2: string; correlation: number }>;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Performance, analytics & rates
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [eurUsdRate, setEurUsdRate] = useState<{ rate: number; date: string } | null>(null);

  // Enrichment
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  // Scope: personal / business / all
  const [scope, setScope] = useState<'all' | 'personal' | 'business'>('all');

  // Filters
  const [selectedBroker, setSelectedBroker] = useState('');
  const [selectedAssetClass, setSelectedAssetClass] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const scopeParam = scope !== 'all' ? `?scope=${scope}` : '';
        const [portfolioRes, perfRes, analyticsRes, currRes] = await Promise.all([
          fetch(`/api/portfolio${scopeParam}`),
          fetch(`/api/performance${scopeParam}`),
          fetch(`/api/analytics${scopeParam}`),
          fetch('/api/currency'),
        ]);

        if (portfolioRes.ok) {
          setData(await portfolioRes.json());
        }
        if (perfRes.ok) {
          setPerformance(await perfRes.json());
        }
        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
        if (currRes.ok) {
          const currData = await currRes.json();
          if (currData.rates?.USD) {
            setEurUsdRate({ rate: currData.rates.USD, date: currData.date });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [scope]);

  const filterOptions = useMemo(() => {
    if (!data) return { brokers: [], assetClasses: [], countries: [], sectors: [], currencies: [] };
    const holdings = data.holdings;
    return {
      brokers: Array.from(new Set(holdings.map((h) => h.broker))).sort(),
      assetClasses: Array.from(new Set(holdings.map((h) => h.currency))).sort(), // placeholder
      countries: Array.from(new Set(holdings.map((h) => h.country).filter(Boolean) as string[])).sort(),
      sectors: Array.from(new Set(holdings.map((h) => h.sector).filter(Boolean) as string[])).sort(),
      currencies: Array.from(new Set(holdings.map((h) => h.currency))).sort(),
    };
  }, [data]);

  const hasFilters = selectedBroker || selectedAssetClass || selectedCountry || selectedSector || selectedCurrency;

  const filteredHoldings = useMemo(() => {
    if (!data) return [];
    return data.holdings.filter((h) => {
      if (selectedBroker && h.broker !== selectedBroker) return false;
      if (selectedCountry && h.country !== selectedCountry) return false;
      if (selectedSector && h.sector !== selectedSector) return false;
      if (selectedCurrency && h.currency !== selectedCurrency) return false;
      return true;
    });
  }, [data, selectedBroker, selectedAssetClass, selectedCountry, selectedSector, selectedCurrency]);

  // Recompute chart data from filtered holdings
  const filteredChartData = useMemo(() => {
    if (!data || !hasFilters) return null; // null = use original data
    const totalValue = filteredHoldings.reduce((sum, h) => sum + h.marketValue, 0);
    // Broker allocation
    const brokerMap = new Map<string, number>();
    for (const h of filteredHoldings) {
      brokerMap.set(h.broker, (brokerMap.get(h.broker) || 0) + h.marketValue);
    }
    const brokerAllocation = Array.from(brokerMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    // Country exposure
    const countryMap = new Map<string, number>();
    for (const h of filteredHoldings) {
      if (h.country) countryMap.set(h.country, (countryMap.get(h.country) || 0) + h.marketValue);
    }
    const countryExposure = Array.from(countryMap.entries())
      .map(([name, value]) => ({ name, value: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    // Sector exposure
    const sectorMap = new Map<string, number>();
    for (const h of filteredHoldings) {
      if (h.sector) sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + h.marketValue);
    }
    const sectorExposure = Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    // Summary override
    const uniqueSecIds = new Set(filteredHoldings.map((h) => h.securityId));
    const summary: PortfolioSummaryData = {
      ...data.summary,
      totalValue,
      uniqueSecurities: uniqueSecIds.size,
      brokerCount: brokerMap.size,
    };
    return { brokerAllocation, countryExposure, sectorExposure, summary };
  }, [data, hasFilters, filteredHoldings]);

  const handleEnrich = useCallback(async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/securities/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, force: true }),
      });
      const json = await res.json();
      if (json.enriched > 0) {
        setEnrichResult(`${json.enriched} ETF(s) enriquecido(s) com dados do JustETF`);
        const scopeParam = scope !== 'all' ? `?scope=${scope}` : '';
        const refreshRes = await fetch(`/api/portfolio${scopeParam}`);
        if (refreshRes.ok) setData(await refreshRes.json());
      } else if (json.errors > 0) {
        setEnrichResult(`Nenhum ETF enriquecido (${json.errors} erros)`);
      } else {
        setEnrichResult('Nenhum ETF encontrado para enriquecer');
      }
    } catch {
      setEnrichResult('Erro ao enriquecer dados');
    } finally {
      setEnriching(false);
    }
  }, [scope]);

  const clearFilters = useCallback(() => {
    setSelectedBroker('');
    setSelectedAssetClass('');
    setSelectedCountry('');
    setSelectedSector('');
    setSelectedCurrency('');
  }, []);


  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">A carregar portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Sem dados no portfolio</h2>
          <p className="text-muted-foreground">
            Importe ficheiros das suas corretoras para começar.
          </p>
        </div>
        <Button asChild>
          <a href="/import">Importar ficheiros</a>
        </Button>
      </div>
    );
  }

  // Helper for return color
  const returnColor = (v: number | null) => {
    if (v === null) return 'text-muted-foreground';
    return v >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const returnSign = (v: number | null) => {
    if (v === null) return '--';
    return (v >= 0 ? '+' : '') + formatPercent(v);
  };

  return (
    <div className="space-y-6">
      <PortfolioSummary summary={filteredChartData?.summary ?? data.summary} />

      {/* Scope toggle + Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border p-1">
          {([
            { value: 'all', label: 'Tudo' },
            { value: 'personal', label: 'Pessoal' },
            { value: 'business', label: 'Empresarial' },
          ] as const).map((s) => (
            <Button
              key={s.value}
              variant={scope === s.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScope(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="h-6 w-px bg-border" />
        <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching}>
          {enriching ? 'A enriquecer...' : 'Atualizar exposições (JustETF)'}
        </Button>
        {eurUsdRate && (
          <span className="text-xs text-muted-foreground/70 tabular-nums">
            EUR/USD {eurUsdRate.rate.toFixed(4)} ({eurUsdRate.date})
          </span>
        )}
        {enrichResult && (
          <span className="text-sm text-muted-foreground">{enrichResult}</span>
        )}
      </div>

      {/* Performance metrics */}
      {performance && performance.snapshotCount >= 2 && (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'TWR', value: performance.ttwror, tooltip: 'Time-Weighted Return — mede a rentabilidade real do portfolio, eliminando o efeito de depósitos e levantamentos.' },
              { label: 'Anualizado', value: performance.annualizedReturn },
              { label: '1 mês', value: performance.periodReturns['1m'] },
              { label: '3 meses', value: performance.periodReturns['3m'] },
              { label: 'YTD', value: performance.periodReturns.ytd },
              { label: 'Max drawdown', value: performance.maxDrawdown ? -performance.maxDrawdown : 0, tooltip: 'Maximum Drawdown — a maior queda percentual do portfolio desde um pico até ao ponto mais baixo seguinte. Exemplo: se o portfolio subiu a 100k€ e depois desceu a 90k€, o drawdown foi de -10%.' },
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
          {performance.lastDate && (
            <p className="text-[11px] text-muted-foreground/60 tabular-nums">
              Dados até {new Date(performance.lastDate).toLocaleDateString('pt-PT')}
            </p>
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <FilterBar
            brokers={filterOptions.brokers}
            assetClasses={filterOptions.assetClasses}
            countries={filterOptions.countries}
            sectors={filterOptions.sectors}
            currencies={filterOptions.currencies}
            selectedBroker={selectedBroker}
            selectedAssetClass={selectedAssetClass}
            selectedCountry={selectedCountry}
            selectedSector={selectedSector}
            selectedCurrency={selectedCurrency}
            onBrokerChange={setSelectedBroker}
            onAssetClassChange={setSelectedAssetClass}
            onCountryChange={setSelectedCountry}
            onSectorChange={setSelectedSector}
            onCurrencyChange={setSelectedCurrency}
            onClear={clearFilters}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Geral</TabsTrigger>
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
                <BrokerPieChart data={filteredChartData?.brokerAllocation ?? data.brokerAllocation} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exposição por país</CardTitle>
              </CardHeader>
              <CardContent>
                <ExposureBarChart data={filteredChartData?.countryExposure ?? data.countryExposure} title="Países" limit={10} />
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
              <ExposureBarChart data={filteredChartData?.sectorExposure ?? data.sectorExposure} title="Setores" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exposição a fatores</CardTitle>
            </CardHeader>
            <CardContent>
              <FactorRadarChart data={data.factorScores} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do património</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryLineChart data={data.history} brokers={data.brokerNames} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holdings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Posições ({filteredHoldings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HoldingsTable holdings={filteredHoldings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency">
          {analytics ? (
            <div className="space-y-6">
              {/* Currency exposure */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exposição cambial real</CardTitle>
                  <CardDescription>Moedas subjacentes dos ativos (look-through via país)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExposureBarChart data={analytics.currencyExposure} title="Moedas" />
                </CardContent>
              </Card>

              {/* Correlation matrix */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Correlação entre ativos</CardTitle>
                  <CardDescription>Baseada nos retornos históricos dos preços</CardDescription>
                </CardHeader>
                <CardContent>
                  <CorrelationMatrix
                    assets={analytics.correlation.assets}
                    matrix={analytics.correlation.matrix}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              A carregar análise...
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
