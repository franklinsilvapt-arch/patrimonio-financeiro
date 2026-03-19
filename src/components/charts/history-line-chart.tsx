'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

const BROKER_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

type Period = '30d' | '90d' | 'ytd' | '2025' | '1y' | 'all';
type ViewMode = 'absolute' | 'percent';

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'ytd', label: 'YTD' },
  { value: '2025', label: '2025' },
  { value: '1y', label: '1 ano' },
  { value: 'all', label: 'Tudo' },
];

interface HistoryLineChartProps {
  data: Array<{ date: string; value: number; [broker: string]: number | string }>;
  brokers?: string[];
}

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
}

function getPeriodBounds(period: Period, lastDate: Date): { start: Date | null; end: Date | null } {
  switch (period) {
    case '30d':
      return { start: new Date(lastDate.getTime() - 30 * 24 * 60 * 60 * 1000), end: null };
    case '90d':
      return { start: new Date(lastDate.getTime() - 90 * 24 * 60 * 60 * 1000), end: null };
    case 'ytd':
      return { start: new Date(lastDate.getFullYear(), 0, 1), end: null };
    case '2025':
      return { start: new Date(2025, 0, 1), end: new Date(2025, 11, 31, 23, 59, 59) };
    case '1y':
      return { start: new Date(lastDate.getTime() - 365 * 24 * 60 * 60 * 1000), end: null };
    case 'all':
      return { start: null, end: null };
  }
}

export function HistoryLineChart({ data, brokers }: HistoryLineChartProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('absolute');

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados históricos
      </div>
    );
  }

  const showBrokers = brokers && brokers.length > 0 && viewMode === 'absolute';
  const lastDate = new Date(data[data.length - 1].date);

  const filteredData = useMemo(() => {
    const { start, end } = getPeriodBounds(period, lastDate);
    if (!start && !end) return data;
    return data.filter((d) => {
      const date = new Date(d.date);
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }, [data, period, lastDate]);

  // Y-axis domain for absolute: tight range around actual data
  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return [0, 0];
    const values = filteredData.map((d) => d.value as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range > 0 ? range * 0.15 : max * 0.05;
    // Pick a nice rounding step based on the range
    const step = range > 500000 ? 50000 : range > 100000 ? 10000 : range > 10000 ? 5000 : 1000;
    const domainMin = Math.floor((min - padding) / step) * step;
    const domainMax = Math.ceil((max + padding) / step) * step;
    return [Math.max(0, domainMin), domainMax];
  }, [filteredData]);

  // Percent variation data for percent view
  const percentData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const baseValue = filteredData[0].value as number;
    if (baseValue <= 0) return filteredData.map((d) => ({ ...d, percent: 0 }));
    return filteredData.map((d) => ({
      ...d,
      percent: (((d.value as number) - baseValue) / baseValue) * 100,
    }));
  }, [filteredData]);

  const periodStats = useMemo(() => {
    if (filteredData.length < 2) return null;
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    const initialValue = first.value as number;
    const finalValue = last.value as number;
    if (initialValue <= 0) return null;
    const variationEur = finalValue - initialValue;
    const variationPct = variationEur / initialValue;
    return { initialValue, finalValue, variationEur, variationPct };
  }, [filteredData]);

  return (
    <div className="space-y-4">
      {/* Period selector + view mode toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {PERIOD_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                period === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('absolute')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              viewMode === 'absolute'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            €
          </button>
          <button
            onClick={() => setViewMode('percent')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              viewMode === 'percent'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            %
          </button>
        </div>
      </div>

      {/* Chart */}
      {viewMode === 'absolute' ? (
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              fontSize={12}
              tick={{ fill: '#94a3b8' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k €`}
              fontSize={12}
              tick={{ fill: '#94a3b8' }}
              width={65}
              domain={yDomain}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(label: string) =>
                new Date(label).toLocaleDateString('pt-PT')
              }
              formatter={(value: number, name: string) => [formatCurrency(value), name === 'value' ? 'Total' : name]}
              contentStyle={{ fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            {showBrokers ? (
              <>
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                {brokers.map((broker, i) => (
                  <Area
                    key={broker}
                    type="monotone"
                    dataKey={broker}
                    stackId="1"
                    stroke={BROKER_COLORS[i % BROKER_COLORS.length]}
                    fill={BROKER_COLORS[i % BROKER_COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1e293b"
                fill="#1e293b"
                fillOpacity={0.08}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={percentData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              fontSize={12}
              tick={{ fill: '#94a3b8' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
              fontSize={12}
              tick={{ fill: '#94a3b8' }}
              width={65}
              domain={['dataMin - 1', 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(label: string) =>
                new Date(label).toLocaleDateString('pt-PT')
              }
              formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Variação']}
              contentStyle={{ fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="percent"
              stroke="#1e293b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Period stats */}
      {periodStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-200 pt-4">
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">Valor inicial</p>
            <p className="text-sm font-bold tabular-nums text-black">
              {formatCurrency(periodStats.initialValue)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">Valor final</p>
            <p className="text-sm font-bold tabular-nums text-black">
              {formatCurrency(periodStats.finalValue)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">Variação (€)</p>
            <p
              className={cn(
                'text-sm font-bold tabular-nums',
                periodStats.variationEur >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {periodStats.variationEur >= 0 ? '+' : ''}
              {formatCurrency(periodStats.variationEur)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500">Variação (%)</p>
            <p
              className={cn(
                'text-sm font-bold tabular-nums',
                periodStats.variationPct >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {periodStats.variationPct >= 0 ? '+' : ''}
              {formatPercent(periodStats.variationPct)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
