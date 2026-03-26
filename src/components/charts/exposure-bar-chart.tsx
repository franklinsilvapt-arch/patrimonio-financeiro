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

const BAR_COLOR = '#1e293b'; // slate-800

export function ExposureBarChart({ data, title, valueFormatter, limit = 0 }: ExposureBarChartProps) {
  const fmt = valueFormatter ?? ((v: number) => formatPercent(v));
  const isOther = (name: string) => name === 'Other' || name === 'Outros' || name === 'Other/Unknown';
  const sorted = [...data].sort((a, b) => {
    if (isOther(a.name) && !isOther(b.name)) return 1;
    if (!isOther(a.name) && isOther(b.name)) return -1;
    return b.value - a.value;
  });
  const [expanded, setExpanded] = useState(false);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Sem dados
      </div>
    );
  }

  const hasMore = limit > 0 && sorted.length > limit;
  const visible = hasMore && !expanded ? sorted.slice(0, limit) : sorted;
  const chartHeight = Math.max(250, visible.length * 32 + 40);

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-500 mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={visible} layout="vertical" margin={{ left: 80, right: 60, top: 5, bottom: 5 }}>
          <XAxis
            type="number"
            tickFormatter={fmt}
            domain={[0, 'auto']}
            fontSize={12}
            tick={{ fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            fontSize={12}
            tick={{ fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => fmt(value)}
            contentStyle={{ fontSize: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {visible.map((entry, index) => (
              <Cell key={entry.name} fill={BAR_COLOR} fillOpacity={1 - index * 0.06} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => fmt(v)}
              style={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-slate-600 hover:text-black hover:underline mt-2 transition-colors"
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
