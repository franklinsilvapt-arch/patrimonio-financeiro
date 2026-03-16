'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatCurrency, formatPercent, formatDate, cn } from '@/lib/utils';

export interface HoldingRow {
  securityId: string;
  securityName: string;
  ticker: string | null;
  isin: string | null;
  broker: string;
  quantity: number;
  price: number | null;
  currency: string;
  marketValue: number;
  weight: number;
  country: string | null;
  sector: string | null;
  factorCoverage: number | null;
  positionDate: string | null;
  priceDate: string | null;
  source: string | null;
}

interface HoldingsTableProps {
  holdings: HoldingRow[];
}

type SortField = 'securityName' | 'ticker' | 'broker' | 'quantity' | 'price' | 'marketValue' | 'weight' | 'positionDate';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortField; label: string; align?: 'right' }> = [
  { key: 'securityName', label: 'Ativo' },
  { key: 'ticker', label: 'Ticker' },
  { key: 'broker', label: 'Corretora' },
  { key: 'quantity', label: 'Qtd', align: 'right' },
  { key: 'price', label: 'Cotação', align: 'right' },
  { key: 'marketValue', label: 'Valor', align: 'right' },
  { key: 'weight', label: 'Peso', align: 'right' },
  { key: 'positionDate', label: 'Data posição' },
];

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), 'pt-PT', { sensitivity: 'base' });
  }
  return dir === 'asc' ? cmp : -cmp;
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('marketValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) =>
      compareValues(a[sortField], b[sortField], sortDir)
    );
  }, [holdings, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sem dados
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                'cursor-pointer select-none hover:text-foreground whitespace-nowrap',
                col.align === 'right' && 'text-right'
              )}
              onClick={() => handleSort(col.key)}
            >
              {col.label}
              {sortField === col.key && (
                <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((h, i) => (
          <TableRow key={`${h.securityId}-${h.broker}-${i}`}>
            <TableCell className="font-medium max-w-[200px] truncate" title={h.securityName}>
              {h.securityName}
            </TableCell>
            <TableCell className="font-mono text-xs">{h.ticker ?? '-'}</TableCell>
            <TableCell>{h.broker}</TableCell>
            <TableCell className="text-right tabular-nums">
              {h.quantity.toLocaleString('pt-PT')}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {h.price != null ? formatCurrency(h.price, h.currency) : '-'}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {formatCurrency(h.marketValue, h.currency)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(h.weight)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {h.positionDate ? formatDate(h.positionDate) : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
