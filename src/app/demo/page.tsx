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
          <TabsTrigger value="xray" className="gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            Raio-X
          </TabsTrigger>
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

        <TabsContent value="xray">
          <div className="space-y-6">
            {/* Score + Grade */}
            <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight">Raio-X do Portfólio</h3>
                  <p className="text-sm text-slate-500 mt-1">Análise gerada por IA com base nas tuas posições atuais</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="flex items-center gap-5 shrink-0">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                      <circle cx="60" cy="60" r="52" stroke="#10b981" strokeWidth="10" fill="none" strokeDasharray="228.7 326.7" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold tabular-nums text-emerald-600">70</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">/ 100</span>
                    </div>
                  </div>
                  <span className="text-3xl font-extrabold px-4 py-1 rounded-lg border-2 bg-blue-100 text-blue-700 border-blue-200">B</span>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {[
                    { label: 'Geográfica', detail: '14 países', score: 20, max: 25 },
                    { label: 'Setorial', detail: '9 setores', score: 19, max: 25 },
                    { label: 'Classes de ativo', detail: '4 classes', score: 14, max: 25 },
                    { label: 'Concentração', detail: '12 posições', score: 17, max: 25 },
                  ].map((dim) => (
                    <div key={dim.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700">{dim.label}</span>
                        <span className="text-xs text-slate-400 tabular-nums">{dim.score}/{dim.max} <span className="text-slate-300">({dim.detail})</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${dim.score / dim.max >= 0.7 ? 'bg-emerald-500' : dim.score / dim.max >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${(dim.score / dim.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Concentration Risk */}
            <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
              <h4 className="text-base font-bold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                As tuas 3 maiores posições representam 58% do portfólio
              </h4>
              <p className="text-sm text-slate-500">Estas posições são ETFs globais amplamente diversificados (VWCE, IWDA, EIMI), o que mitiga o risco de concentração real apesar do peso elevado.</p>
            </div>

            {/* Strengths + Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
                <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Pontos fortes
                </h4>
                <ul className="space-y-2">
                  <li className="text-sm text-slate-600 flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">+</span>Boa diversificação geográfica com exposição a 14 países</li>
                  <li className="text-sm text-slate-600 flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">+</span>Base sólida em ETFs de baixo custo com ampla cobertura de mercado</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
                <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                  Riscos a considerar
                </h4>
                <ul className="space-y-2">
                  <li className="text-sm text-slate-600 flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0">!</span>Exposição de 62% aos EUA através dos ETFs globais</li>
                  <li className="text-sm text-slate-600 flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0">!</span>Setor tecnológico representa 28% da exposição total</li>
                </ul>
              </div>
            </div>

            {/* ETF Overlap */}
            <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
              <h4 className="text-base font-bold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                Sobreposição de ETFs
              </h4>
              <p className="text-sm text-slate-500">O VWCE e o IWDA partilham cerca de 85% das mesmas empresas (ambos seguem mercados desenvolvidos globais). O EIMI complementa com mercados emergentes sem sobreposição significativa.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
