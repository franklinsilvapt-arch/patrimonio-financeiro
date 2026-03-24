'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface Holding {
  id: string;
  securityId: string;
  securityName: string;
  ticker: string;
  isin: string;
  assetClass: string;
  broker: string;
  brokerSlug: string;
  accountName: string;
  quantity: number;
  price: number;
  currency: string;
  marketValue: number;
  weight: number;
  country: string | null;
  sector: string | null;
  positionDate: string;
  priceDate: string;
  priceSource: string;
  importDate: string;
  dataSource: string;
  countryExposures: unknown;
  sectorExposures: unknown;
  factorExposures: unknown;
}

interface AggregatedHolding {
  key: string;
  securityName: string;
  ticker: string;
  isin: string;
  totalQuantity: number;
  totalMarketValue: number;
  currency: string;
  brokers: string[];
  assetClass: string;
  country: string | null;
  sector: string | null;
  weight: number;
  holdingIds: string[];
}

type ViewMode = 'position' | 'aggregated';
type SortField = 'name' | 'value' | 'weight';
type SortDir = 'asc' | 'desc';

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('position');
  const [filterBroker, setFilterBroker] = useState<string>('all');
  const [filterAssetClass, setFilterAssetClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/holdings');
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings ?? []);
        setTotalPortfolioValue(data.totalValue ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Delete a single holding
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem a certeza que quer apagar a posição "${name}"?`)) return;
    try {
      const res = await fetch(`/api/holdings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchHoldings();
      }
    } catch {
      // silently fail
    }
  };

  // Delete all holdings
  const handleDeleteAll = async () => {
    if (!window.confirm('Tem a certeza que quer apagar TODAS as posições? Esta ação é irreversível.')) return;
    try {
      const res = await fetch('/api/holdings', { method: 'DELETE' });
      if (res.ok) {
        await fetchHoldings();
      }
    } catch {
      // silently fail
    }
  };

  // Derive unique brokers and asset classes for filters
  const brokers = Array.from(new Set(holdings.map((h) => h.broker))).sort();
  const assetClasses = Array.from(new Set(holdings.map((h) => h.assetClass).filter(Boolean))).sort();

  // Filter holdings
  const filtered = holdings.filter((h) => {
    if (filterBroker !== 'all' && h.broker !== filterBroker) return false;
    if (filterAssetClass !== 'all' && h.assetClass !== filterAssetClass) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !(h.securityName ?? '').toLowerCase().includes(q) &&
        !(h.ticker ?? '').toLowerCase().includes(q) &&
        !(h.isin ?? '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Aggregate holdings by ISIN (or ticker+name fallback)
  const aggregated: AggregatedHolding[] = (() => {
    const map = new Map<string, AggregatedHolding>();
    for (const h of filtered) {
      const key = h.isin || `${h.ticker}_${h.securityName}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += h.quantity;
        existing.totalMarketValue += h.marketValue;
        existing.weight += h.weight;
        existing.holdingIds.push(h.id);
        if (!existing.brokers.includes(h.broker)) {
          existing.brokers.push(h.broker);
        }
      } else {
        map.set(key, {
          key,
          securityName: h.securityName,
          ticker: h.ticker,
          isin: h.isin,
          totalQuantity: h.quantity,
          totalMarketValue: h.marketValue,
          currency: h.currency,
          brokers: [h.broker],
          assetClass: h.assetClass,
          country: h.country,
          sector: h.sector,
          weight: h.weight,
          holdingIds: [h.id],
        });
      }
    }
    return Array.from(map.values());
  })();

  // Sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = (a.securityName ?? '').localeCompare(b.securityName ?? '');
    else if (sortField === 'value') cmp = a.marketValue - b.marketValue;
    else if (sortField === 'weight') cmp = a.weight - b.weight;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const sortedAggregated = [...aggregated].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = (a.securityName ?? '').localeCompare(b.securityName ?? '');
    else if (sortField === 'value') cmp = a.totalMarketValue - b.totalMarketValue;
    else if (sortField === 'weight') cmp = a.weight - b.weight;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const filteredTotalValue = filtered.reduce((sum, h) => sum + h.marketValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posições</h1>
          <p className="text-muted-foreground">Todas as posições do teu portfolio agregado.</p>
        </div>
        {holdings.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar todas
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Pesquisar nome, ticker ou ISIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            {/* Broker filter */}
            <select
              value={filterBroker}
              onChange={(e) => setFilterBroker(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todas as corretoras</option>
              {brokers.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Asset class filter */}
            <select
              value={filterAssetClass}
              onChange={(e) => setFilterAssetClass(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todas as classes</option>
              {assetClasses.map((ac) => (
                <option key={ac} value={ac}>
                  {ac}
                </option>
              ))}
            </select>

            {/* View mode toggle */}
            <div className="ml-auto flex items-center gap-1 rounded-md border p-1">
              <Button
                variant={viewMode === 'position' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('position')}
              >
                Ver por posição
              </Button>
              <Button
                variant={viewMode === 'aggregated' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('aggregated')}
              >
                Ver agregado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Valor total</p>
            <p className="text-2xl font-bold">{formatCurrency(filteredTotalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Posições</p>
            <p className="text-2xl font-bold">
              {viewMode === 'position' ? sortedFiltered.length : sortedAggregated.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Corretoras</p>
            <p className="text-2xl font-bold">{brokers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Classes de ativos</p>
            <p className="text-2xl font-bold">{assetClasses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">A carregar...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma posição encontrada.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Importa ficheiros CSV na página de importação para ver as tuas posições.
              </p>
            </div>
          ) : viewMode === 'position' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    Nome{sortIndicator('name')}
                  </TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Corretora</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Cotação</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('value')}>
                    Valor{sortIndicator('value')}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('weight')}>
                    Peso{sortIndicator('weight')}
                  </TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead>Data posição</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFiltered.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.securityName}</TableCell>
                    <TableCell>{h.ticker}</TableCell>
                    <TableCell className="font-mono text-xs">{h.isin}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{h.assetClass}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{h.broker}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{h.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(h.price, h.currency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(h.marketValue, h.currency)}</TableCell>
                    <TableCell className="text-right">{formatPercent(h.weight)}</TableCell>
                    <TableCell>{h.currency}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(h.positionDate)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(h.id, h.securityName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    Nome{sortIndicator('name')}
                  </TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="text-right">Qtd total</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('value')}>
                    Valor total{sortIndicator('value')}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('weight')}>
                    Peso{sortIndicator('weight')}
                  </TableHead>
                  <TableHead>Corretoras</TableHead>
                  <TableHead>Moeda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAggregated.map((h) => (
                  <TableRow key={h.key}>
                    <TableCell className="font-medium">{h.securityName}</TableCell>
                    <TableCell>{h.ticker}</TableCell>
                    <TableCell className="font-mono text-xs">{h.isin}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{h.assetClass}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{h.totalQuantity}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(h.totalMarketValue, h.currency)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(h.weight)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {h.brokers.map((b) => (
                          <Badge key={b} variant="outline" className="text-xs">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{h.currency}</TableCell>
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
