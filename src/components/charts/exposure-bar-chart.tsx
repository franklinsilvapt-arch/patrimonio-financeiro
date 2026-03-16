'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { formatPercent } from '@/lib/utils';

interface ExposureBarChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  valueFormatter?: (v: number) => string;
  limit?: number;
}

const BAR_COLOR = '#3b82f6';

export function ExposureBarChart({ data, title, valueFormatter, limit = 0 }: ExposureBarChartProps) {
  const fmt = valueFormatter ?? ((v: number) => formatPercent(v));
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const [expanded, setExpanded] = useState(false);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados
      </div>
    );
  }

  const hasMore = limit > 0 && sorted.length > limit;
  const visible = hasMore && !expanded ? sorted.slice(0, limit) : sorted;
  const chartHeight = Math.max(250, visible.length * 32 + 40);

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={visible} layout="vertical" margin={{ left: 80, right: 60, top: 5, bottom: 5 }}>
          <XAxis
            type="number"
            tickFormatter={fmt}
            domain={[0, 'auto']}
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            fontSize={12}
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip
            formatter={(value: number) => fmt(value)}
            contentStyle={{ fontSize: '0.875rem' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {visible.map((entry) => (
              <Cell key={entry.name} fill={BAR_COLOR} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => fmt(v)}
              style={{ fontSize: 12, fill: '#6b7280' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
