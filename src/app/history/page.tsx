'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Camera } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatCurrency, formatDate, formatPercent, cn } from '@/lib/utils';

type DateRange = '30d' | '90d' | 'ytd' | '2025' | '1y' | 'all';
type ViewMode = 'absolute' | 'percent';

interface Snapshot {
  id: string;
  date: string;
  createdAt: string;
  totalValue: number;
  brokerCount: number;
  brokerBreakdown: Record<string, number> | null;
}

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('absolute');
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreateSnapshot = async () => {
    setCreating(true);
    setCreateMessage(null);
    try {
      const res = await fetch('/api/snapshots', { method: 'POST' });
      if (res.ok) {
        setCreateMessage('Snapshot criado com sucesso!');
        fetchSnapshots();
      } else {
        const data = await res.json();
        setCreateMessage(data.error || 'Erro ao criar snapshot');
      }
    } catch {
      setCreateMessage('Erro de rede ao criar snapshot');
    } finally {
      setCreating(false);
      setTimeout(() => setCreateMessage(null), 3000);
    }
  };

  // Filter by date range
  const filteredSnapshots = useMemo(() => {
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length === 0) return [];

    const lastDate = new Date(sorted[sorted.length - 1].date);

    let cutoff: Date;
    let endDate: Date | null = null;
    switch (dateRange) {
      case '30d':
        cutoff = new Date(lastDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoff = new Date(lastDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        cutoff = new Date(lastDate.getFullYear(), 0, 1);
        break;
      case '2025':
        cutoff = new Date(2025, 0, 1);
        endDate = new Date(2025, 11, 31, 23, 59, 59);
        break;
      case '1y':
        cutoff = new Date(lastDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return sorted;
    }

    return sorted.filter((s) => {
      const d = new Date(s.date);
      if (d < cutoff) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [snapshots, dateRange]);

  // Sort chronologically for chart
  const sortedSnapshots = useMemo(
    () => [...filteredSnapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filteredSnapshots]
  );

  // Chart data — absolute
  const chartData = useMemo(
    () =>
      sortedSnapshots.map((s) => ({
        date: formatDate(s.date),
        valor: s.totalValue,
      })),
    [sortedSnapshots]
  );

  // Chart data — percent (base 100)
  const chartDataPercent = useMemo(() => {
    if (sortedSnapshots.length === 0) return [];
    const baseValue = sortedSnapshots[0].totalValue;
    if (baseValue <= 0) return sortedSnapshots.map((s) => ({ date: formatDate(s.date), percent: 0 }));
    return sortedSnapshots.map((s) => ({
      date: formatDate(s.date),
      percent: ((s.totalValue - baseValue) / baseValue) * 100,
    }));
  }, [sortedSnapshots]);

  // Period stats
  const periodStats = useMemo(() => {
    if (sortedSnapshots.length < 2) return null;
    const first = sortedSnapshots[0];
    const last = sortedSnapshots[sortedSnapshots.length - 1];
    if (first.totalValue <= 0) return null;
    const variationEur = last.totalValue - first.totalValue;
    const variationPct = variationEur / first.totalValue;
    return {
      initialValue: first.totalValue,
      finalValue: last.totalValue,
      variationEur,
      variationPct,
    };
  }, [sortedSnapshots]);

  // Compute variation for table (compared to previous snapshot)
  const snapshotsWithVariation = useMemo(() => {
    const sorted = [...filteredSnapshots].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted.map((s, i) => {
      const prev = sorted[i + 1];
      const variation = prev ? (s.totalValue - prev.totalValue) / prev.totalValue : null;
      const variationAbsolute = prev ? s.totalValue - prev.totalValue : null;
      return { ...s, variation, variationAbsolute };
    });
  }, [filteredSnapshots]);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: 'ytd', label: 'YTD' },
    { value: '2025', label: '2025' },
    { value: '1y', label: '1 ano' },
    { value: 'all', label: 'Tudo' },
  ];

  const gainLossColor = (value: number | null) => {
    if (value === null) return '';
    return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
  };

  // Y-axis domain for absolute: start near the minimum value, not 0
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0];
    const values = chartData.map((d) => d.valor);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || max * 0.05;
    // Round down to nearest 50k for a clean axis start
    const floorMin = Math.floor((min - padding) / 50000) * 50000;
    return [Math.max(0, floorMin), max + padding];
  }, [chartData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground">Evolução do valor do seu património ao longo do tempo.</p>
        </div>
        <div className="flex items-center gap-2">
          {createMessage && (
            <span className="text-sm text-muted-foreground">{createMessage}</span>
          )}
          <Button onClick={handleCreateSnapshot} disabled={creating}>
            <Camera className="mr-2 h-4 w-4" />
            {creating ? 'A criar...' : 'Criar snapshot'}
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do património</CardTitle>
          <CardDescription>Valor total ao longo do tempo (um ponto por cada importação)</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Period selector + view mode toggle */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex flex-wrap gap-1">
              {dateRangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    dateRange === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {opt.label}
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

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">A carregar...</p>
          ) : chartData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Sem dados de histórico.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Importe um ficheiro CSV para criar o primeiro snapshot automaticamente.
              </p>
            </div>
          ) : chartData.length === 1 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Apenas 1 snapshot disponível ({chartData[0].date}).
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Importe novamente no próximo mês para visualizar a evolução.
              </p>
              <p className="text-2xl font-bold mt-4">{formatCurrency(chartData[0].valor)}</p>
            </div>
          ) : viewMode === 'absolute' ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k €`}
                  width={65}
                  domain={yDomain}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  labelStyle={{ fontWeight: 'bold' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartDataPercent} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`}
                  width={65}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Variação']}
                  labelStyle={{ fontWeight: 'bold' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Period stats */}
          {periodStats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t pt-4 mt-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Valor inicial</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(periodStats.initialValue)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Valor final</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(periodStats.finalValue)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Variação (€)</p>
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    periodStats.variationEur >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {periodStats.variationEur >= 0 ? '+' : ''}
                  {formatCurrency(periodStats.variationEur)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Variação (%)</p>
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    periodStats.variationPct >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {periodStats.variationPct >= 0 ? '+' : ''}
                  {formatPercent(periodStats.variationPct)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Snapshots</CardTitle>
          <CardDescription>Registos históricos do valor do património</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">A carregar...</p>
          ) : snapshotsWithVariation.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum snapshot encontrado. Importe um ficheiro CSV para criar automaticamente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor total</TableHead>
                  <TableHead className="text-right">Nr. corretoras</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshotsWithVariation.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(s.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{s.brokerCount}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${gainLossColor(s.variation)}`}>
                      {s.variation !== null ? (
                        <>
                          {s.variationAbsolute! >= 0 ? '+' : ''}
                          {formatCurrency(s.variationAbsolute!)} ({s.variation >= 0 ? '+' : ''}{formatPercent(s.variation)})
                        </>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
