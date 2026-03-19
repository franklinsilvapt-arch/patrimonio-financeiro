'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface FactorRadarChartProps {
  data: Array<{ factor: string; score: number; fullMark?: number }>;
}

const FACTOR_LABELS: Record<string, string> = {
  value: 'Value',
  size: 'Size',
  momentum: 'Momentum',
  quality: 'Quality',
  volatility: 'Volatility',
  growth: 'Growth',
};

export function FactorRadarChart({ data }: FactorRadarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3 px-4">
        <p className="text-muted-foreground text-sm">Sem dados de fatores</p>
        <p className="text-muted-foreground/70 text-xs max-w-md leading-relaxed">
          Para ver os fatores dos teus ETFs, acede à{' '}
          <a href="https://www.morningstar.com" target="_blank" rel="noopener noreferrer" className="underline font-medium text-muted-foreground">
            Morningstar
          </a>{' '}
          (cria conta grátis), abre a página do ETF, vai a &quot;Portfolio&quot; &rarr; &quot;Factor Profile&quot;,
          tira um screenshot e importa-o na tab{' '}
          <a href="/import" className="underline font-medium text-muted-foreground">Importar</a>.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    factor: FACTOR_LABELS[d.factor] ?? d.factor,
    fullMark: d.fullMark ?? 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="factor"
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[-1, 1]}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickCount={5}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => value.toFixed(2)}
          contentStyle={{ fontSize: '0.875rem' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
