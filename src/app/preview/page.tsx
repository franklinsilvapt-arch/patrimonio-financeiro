'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DonutChart } from '@/components/charts/donut-chart';
import { formatCurrency } from '@/lib/utils';

interface Position {
  name: string;
  ticker?: string | null;
  isin?: string | null;
  quantity: number;
  price?: number | null;
  marketValue: number;
  currency: string;
  assetClass: string;
}

interface PreviewData {
  brokerName: string;
  totalValue: number | null;
  positions: Position[];
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  ETF: 'ETFs',
  EQUITY: 'Ações',
  CASH: 'Liquidez',
  BOND: 'Obrigações',
  FUND: 'Fundos',
  CRYPTO: 'Crypto',
  COMMODITY: 'Matérias-primas',
  OTHER: 'Outros',
};

export default function PreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<PreviewData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('preview-data');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      setData(JSON.parse(stored));
    } catch {
      router.push('/');
    }
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">A carregar...</div>
      </div>
    );
  }

  const totalValue = data.totalValue ?? data.positions.reduce((s, p) => s + (p.marketValue || 0), 0);

  // Broker allocation (all positions grouped by broker — single broker from one screenshot)
  const brokerData = [{ name: data.brokerName || 'Desconhecido', value: totalValue }];

  // Asset class allocation
  const assetClassMap: Record<string, number> = {};
  for (const p of data.positions) {
    const label = ASSET_CLASS_LABELS[p.assetClass] || p.assetClass;
    assetClassMap[label] = (assetClassMap[label] || 0) + (p.marketValue || 0);
  }
  const assetClassData = Object.entries(assetClassMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const lockedTabs = ['Países', 'Setores', 'Fatores', 'Cambial', 'Histórico'];

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="flex items-center justify-between px-6 h-14 max-w-7xl mx-auto">
          <Link href="/" className="text-xl font-bold tracking-tighter text-black font-[family-name:var(--font-manrope)]">
            Património Financeiro
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/registar"
              className="px-5 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/entrar"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-black transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Success banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-emerald-800">
              <strong>{data.positions.length} {data.positions.length === 1 ? 'posição extraída' : 'posições extraídas'}</strong> de <strong>{data.brokerName}</strong>.
              Cria uma conta para guardar os teus dados e aceder a todas as funcionalidades.
            </p>
          </div>
          <Link
            href="/registar"
            className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
          >
            Criar conta
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Valor total</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {formatCurrency(totalValue, 'EUR')}
            </h2>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Nr. ativos</p>
            <h2 className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black tabular-nums">
              {data.positions.filter(p => p.assetClass !== 'CASH').length}
            </h2>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <p className="text-slate-500 text-sm font-medium mb-1">Corretora</p>
            <h2 className="text-xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight text-black">
              {data.brokerName || 'Desconhecido'}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 overflow-x-auto border-b border-slate-200 pb-0">
          <button className="pb-3 text-sm font-bold text-black border-b-2 border-black whitespace-nowrap">
            Geral
          </button>
          <button className="pb-3 text-sm font-bold text-black border-b-2 border-black whitespace-nowrap">
            Posições
          </button>
          {lockedTabs.map((tab) => (
            <Link
              key={tab}
              href="/registar"
              className="pb-3 text-sm font-medium text-slate-300 whitespace-nowrap flex items-center gap-1 hover:text-slate-400 transition-colors"
            >
              {tab}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Charts — Geral */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Broker allocation */}
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-8">
              Alocação por corretora
            </h3>
            <DonutChart data={brokerData} colorScheme="slate" />
          </div>

          {/* Asset class allocation */}
          <div className="bg-white p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight mb-8">
              Alocação por tipo de ativo
            </h3>
            <DonutChart data={assetClassData} colorScheme="green" />
          </div>
        </div>

        {/* Positions table */}
        <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] text-black tracking-tight">
              Posições
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 font-medium text-slate-500">Nome</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Ticker</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Classe</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-right">Qtd</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-black">{p.name}</td>
                    <td className="px-6 py-3 text-slate-600">{p.ticker || '-'}</td>
                    <td className="px-6 py-3 text-slate-600">{ASSET_CLASS_LABELS[p.assetClass] || p.assetClass}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-600">{p.quantity}</td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-black">
                      {formatCurrency(p.marketValue, p.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA bottom */}
        <div className="bg-black text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight mb-3">
            Gostaste do que viste?
          </h2>
          <p className="text-slate-400 mb-6">
            Cria uma conta grátis para guardar os teus dados, adicionar mais corretoras e aceder a todas as análises.
          </p>
          <Link
            href="/registar"
            className="inline-block px-8 py-3 bg-emerald-400 text-black font-bold rounded-lg hover:bg-emerald-300 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>
      </main>
    </div>
  );
}
