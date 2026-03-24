'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PortfolioSummary, type PortfolioSummaryData } from '@/components/portfolio-summary';
import { FilterBar } from '@/components/filter-bar';
import { HoldingsTable, type HoldingRow } from '@/components/holdings-table';
import { BrokerPieChart } from '@/components/charts/broker-pie-chart';
import { DonutChart } from '@/components/charts/donut-chart';
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
  assetClassAllocation: Array<{ name: string; value: number }>;
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
// Helpers
// ---------------------------------------------------------------------------

const ASSET_CLASS_LABELS: Record<string, string> = {
  ETF: 'ETFs',
  EQUITY: 'Ações',
  BOND: 'Obrigações',
  FUND: 'Fundos',
  CASH: 'Liquidez',
  CRYPTO: 'Crypto',
  COMMODITY: 'Matérias-primas',
  OTHER: 'Outros',
};

function translateAssetClasses(data: Array<{ name: string; value: number }>) {
  return data.map((d) => ({ ...d, name: ASSET_CLASS_LABELS[d.name] || d.name }));
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
    // Asset class allocation
    const assetClassMap = new Map<string, number>();
    for (const h of filteredHoldings) {
      if (h.assetClass) assetClassMap.set(h.assetClass, (assetClassMap.get(h.assetClass) || 0) + h.marketValue);
    }
    const assetClassAllocation = Array.from(assetClassMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { brokerAllocation, assetClassAllocation, countryExposure, sectorExposure, summary };
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
            Importa ficheiros das tuas corretoras para começar.
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
      <PortfolioSummary
        summary={filteredChartData?.summary ?? data.summary}
        monthlyChange={performance?.periodReturns['1m'] ?? null}
      />

      {/* Scope toggle + Action bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {([
            { value: 'all', label: 'Tudo' },
            { value: 'personal', label: 'Pessoal' },
            { value: 'business', label: 'Empresarial' },
          ] as const).map((s) => (
            <button
              key={s.value}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
                scope === s.value
                  ? 'bg-white shadow-sm text-black'
                  : 'text-slate-500 hover:text-black'
              }`}
              onClick={() => setScope(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Performance compact pill */}
          {performance && performance.snapshotCount >= 2 && (
            <div className="flex items-center bg-slate-200 px-4 py-2 rounded-lg gap-3">
              {[
                { label: 'Retorno total', value: performance.ttwror, bold: true },
                { label: 'YTD', value: performance.periodReturns.ytd },
                { label: 'Drawdown', value: performance.maxDrawdown ? -performance.maxDrawdown : 0 },
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
          )}
          <button
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            onClick={handleEnrich}
            disabled={enriching}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {enriching ? 'A enriquecer...' : 'Atualizar exposições'}
          </button>
          {eurUsdRate && (
            <div className="flex items-center bg-white border border-slate-200 px-4 py-2 rounded-lg gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase">EUR/USD</span>
              <span className="text-sm font-bold text-black tabular-nums">{eurUsdRate.rate.toFixed(4)}</span>
            </div>
          )}
        </div>
        {enrichResult && (
          <span className="text-sm text-slate-500">{enrichResult}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-4">
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
              <DonutChart data={filteredChartData?.brokerAllocation ?? data.brokerAllocation} colorScheme="slate" />
            </div>
            <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
              <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-8">Alocação por tipo de ativo</h3>
              <DonutChart data={translateAssetClasses(filteredChartData?.assetClassAllocation ?? data.assetClassAllocation)} colorScheme="green" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="countries">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Exposição por país</h3>
            <ExposureBarChart data={filteredChartData?.countryExposure ?? data.countryExposure} title="Países" limit={10} />
          </div>
        </TabsContent>

        <TabsContent value="sectors">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Exposição por setor</h3>
            <ExposureBarChart data={filteredChartData?.sectorExposure ?? data.sectorExposure} title="Setores" />
          </div>
        </TabsContent>

        <TabsContent value="factors">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Exposição a fatores</h3>
            <FactorRadarChart data={data.factorScores} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Evolução do património</h3>
            <HistoryLineChart data={data.history} />
          </div>
        </TabsContent>

        <TabsContent value="holdings">
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-6">Posições ({filteredHoldings.length})</h3>
            <HoldingsTable holdings={filteredHoldings} />
          </div>
        </TabsContent>

        <TabsContent value="currency">
          {analytics ? (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
                <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-1">Exposição cambial real</h3>
                <p className="text-sm text-slate-500 mb-6">Moedas subjacentes dos ativos (look-through via país)</p>
                <ExposureBarChart data={analytics.currencyExposure} title="Moedas" />
              </div>

              <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
                <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-1">Correlação entre ativos</h3>
                <p className="text-sm text-slate-500 mb-6">Baseada nos retornos históricos dos preços</p>
                <CorrelationMatrix
                  assets={analytics.correlation.assets}
                  matrix={analytics.correlation.matrix}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              A carregar análise...
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
